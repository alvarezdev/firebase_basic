import {bucket} from "../config/firebase";

/**
 * Build a user-owned Cloud Storage path.
 *
 * @param {string} ownerId Authenticated user ID.
 * @param {string} filename File name provided by the client.
 * @return {string} Storage object path scoped to the user.
 */
export function getUserFilePath(ownerId: string, filename: string) {
  const sanitizedFilename = filename.replace(/^\/+/, "");
  return `users/${ownerId}/${sanitizedFilename}`;
}

/**
 * UPLOAD - Upload a file to Cloud Storage
 *
 * @param {string} filename Name of the file in Cloud Storage.
 * @param {Buffer | string} fileData File content to save.
 * @param {string | undefined} contentType File MIME type.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<object>} Uploaded file metadata.
 */
export async function uploadFile(
  filename: string,
  fileData: Buffer | string,
  contentType: string | undefined,
  ownerId: string
) {
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
 * @return {Promise<object | null>} File data and metadata, or null.
 */
export async function downloadFile(filename: string, ownerId: string) {
  const filePath = getUserFilePath(ownerId, filename);
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
 * @return {Promise<object>} Files owned by the authenticated user.
 */
export async function listFiles(ownerId: string) {
  const [files] = await bucket.getFiles({
    prefix: `users/${ownerId}/`,
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
 * @return {Promise<object | null>} Delete confirmation, or null if missing.
 */
export async function deleteFile(filename: string, ownerId: string) {
  const filePath = getUserFilePath(ownerId, filename);
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
