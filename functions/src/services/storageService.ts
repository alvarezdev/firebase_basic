import {bucket} from "../config/firebase";
import {badRequestError, isAdminRole} from "../shared";

export type UploadedFileResponse = {
  message: string;
  filename: string;
  path: string;
  size: unknown;
  timeCreated: unknown;
  contentType: unknown;
  storageUri: string;
};

export type DownloadFileResponse = {
  filename: string;
  path: string;
  size: unknown;
  contentType: string;
  data: Buffer;
};

export type ListedFileResponse = {
  name: string;
  size: unknown;
  timeCreated: unknown;
  contentType: unknown;
};

export type ListFilesResponse = {
  count: number;
  files: ListedFileResponse[];
};

export type DeleteFileResponse = {
  message: string;
  filename: string;
  path: string;
};

const safePathSegmentPattern = /^[A-Za-z0-9._-]+$/;

/**
 * Validate a single safe Storage path segment.
 *
 * @param {string} segment Path segment to validate.
 * @return {boolean} True when the segment is safe.
 */
function isSafePathSegment(segment: string): boolean {
  return segment.length > 0 &&
    safePathSegmentPattern.test(segment) &&
    !segment.includes("..");
}

/**
 * Ensure regular users only address one file name, not a path.
 *
 * @param {string} filename File name provided by the client.
 */
function assertSafeFilename(filename: string): void {
  if (!isSafePathSegment(filename)) {
    throw badRequestError("Filename must be a single safe file name");
  }
}

/**
 * Ensure admin file access remains scoped to user-owned files.
 *
 * @param {string} filePath Storage path provided by an admin.
 * @return {string} Validated Storage path.
 */
function validateAdminFilePath(filePath: string): string {
  const segments = filePath.split("/");
  const [root, userId, filename] = segments;

  if (
    segments.length !== 3 ||
    root !== "users" ||
    !isSafePathSegment(userId) ||
    !isSafePathSegment(filename)
  ) {
    throw badRequestError(
      "Admin storage path must use users/{uid}/{filename}"
    );
  }

  return filePath;
}

/**
 * Resolve the Storage path allowed for the authenticated role.
 *
 * @param {string} filename File name or admin path.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {string} Validated Storage path.
 */
function resolveFilePath(
  filename: string,
  ownerId: string,
  role: unknown
): string {
  return isAdminRole(role) ?
    validateAdminFilePath(filename) :
    getUserFilePath(ownerId, filename);
}

/**
 * Build a user-owned Cloud Storage path.
 *
 * @param {string} ownerId Authenticated user ID.
 * @param {string} filename File name provided by the client.
 * @return {string} Storage object path scoped to the user.
 */
export function getUserFilePath(ownerId: string, filename: string): string {
  assertSafeFilename(filename);
  return `users/${ownerId}/${filename}`;
}

/**
 * UPLOAD - Upload a file to Cloud Storage
 *
 * @param {string} filename Name of the file in Cloud Storage.
 * @param {Buffer | string} fileData File content to save.
 * @param {string | undefined} contentType File MIME type.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<UploadedFileResponse>} Uploaded file metadata.
 */
export async function uploadFile(
  filename: string,
  fileData: Buffer | string,
  contentType: string | undefined,
  ownerId: string
): Promise<UploadedFileResponse> {
  // Get reference to the file in Cloud Storage
  const filePath = getUserFilePath(ownerId, filename);
  const file = bucket.file(filePath);

  // Upload file data
  await file.save(fileData, {
    metadata: {
      contentType: contentType || "application/octet-stream",
    },
  });

  // Get file metadata
  const [metadata] = await file.getMetadata();

  return {
    message: "File uploaded successfully",
    filename: filename,
    path: filePath,
    size: metadata.size,
    timeCreated: metadata.timeCreated,
    contentType: metadata.contentType,
    storageUri: `gs://${bucket.name}/${filePath}`,
  };
}

/**
 * DOWNLOAD - Download a file from Cloud Storage
 *
 * @param {string} filename Name of the file in Cloud Storage.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<DownloadFileResponse | null>} File data and metadata.
 */
export async function downloadFile(
  filename: string,
  ownerId: string,
  role: unknown
): Promise<DownloadFileResponse | null> {
  const filePath = resolveFilePath(filename, ownerId, role);
  const file = bucket.file(filePath);

  // Check if file exists
  const [exists] = await file.exists();

  if (!exists) {
    return null;
  }

  // Get file metadata
  const [metadata] = await file.getMetadata();

  // Download file data
  const [fileData] = await file.download();

  return {
    filename: filename,
    path: filePath,
    size: metadata.size,
    contentType: (metadata.contentType as string) || "application/octet-stream",
    data: fileData,
  };
}

/**
 * LIST - List all files in Cloud Storage
 *
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<ListFilesResponse>} Files owned by the authenticated user.
 */
export async function listFiles(
  ownerId: string,
  role: unknown
): Promise<ListFilesResponse> {
  const [files] = await bucket.getFiles({
    prefix: isAdminRole(role) ? "users/" : `users/${ownerId}/`,
  });

  return {
    count: files.length,
    files: files.map((file) => ({
      name: file.name,
      size: file.metadata.size,
      timeCreated: file.metadata.timeCreated,
      contentType: file.metadata.contentType,
    })),
  };
}

/**
 * DELETE - Delete a file from Cloud Storage
 *
 * @param {string} filename Name of the file in Cloud Storage.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<DeleteFileResponse | null>} Delete confirmation, or null.
 */
export async function deleteFile(
  filename: string,
  ownerId: string,
  role: unknown
): Promise<DeleteFileResponse | null> {
  const filePath = resolveFilePath(filename, ownerId, role);
  const file = bucket.file(filePath);

  // Check if file exists
  const [exists] = await file.exists();

  if (!exists) {
    return null;
  }

  // Delete the file
  await file.delete();

  return {
    message: "File deleted successfully",
    filename: filename,
    path: filePath,
  };
}
