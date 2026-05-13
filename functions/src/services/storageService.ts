import {bucket} from "../config/firebase";

/**
 * UPLOAD - Upload a file to Cloud Storage
 *
 * @param {string} filename Name of the file in Cloud Storage.
 * @param {Buffer | string} fileData File content to save.
 * @param {string | undefined} contentType File MIME type.
 * @return {Promise<object>} Uploaded file metadata.
 */
export async function uploadFile(
  filename: string,
  fileData: Buffer | string,
  contentType: string | undefined
) {
  // Get reference to the file in Cloud Storage
  const file = bucket.file(filename);

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
    size: metadata.size,
    timeCreated: metadata.timeCreated,
    contentType: metadata.contentType,
    path: `gs://${bucket.name}/${filename}`,
  };
}

/**
 * DOWNLOAD - Download a file from Cloud Storage
 *
 * @param {string} filename Name of the file in Cloud Storage.
 * @return {Promise<object | null>} File data and metadata, or null.
 */
export async function downloadFile(filename: string) {
  const file = bucket.file(filename);

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
    size: metadata.size,
    contentType: (metadata.contentType as string) || "application/octet-stream",
    data: fileData,
  };
}

/**
 * LIST - List all files in Cloud Storage
 */
export async function listFiles() {
  const [files] = await bucket.getFiles();

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
 * @return {Promise<object | null>} Delete confirmation, or null if missing.
 */
export async function deleteFile(filename: string) {
  const file = bucket.file(filename);

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
  };
}
