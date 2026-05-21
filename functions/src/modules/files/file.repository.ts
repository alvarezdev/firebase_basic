import {bucket} from "../../config/firebase";

export type FileData = Buffer | string;

export type StoredFileMetadata = {
  size: unknown;
  timeCreated?: unknown;
  contentType?: unknown;
};

export type StoredFileRecord = {
  name: string;
  metadata: StoredFileMetadata;
};

/**
 * Save file data to Cloud Storage.
 *
 * @param {string} filePath Storage object path.
 * @param {FileData} fileData File content.
 * @param {string} contentType File MIME type.
 * @return {Promise<StoredFileMetadata>} Saved file metadata.
 */
export async function saveFile(
  filePath: string,
  fileData: FileData,
  contentType: string
): Promise<StoredFileMetadata> {
  const file = bucket.file(filePath);

  await file.save(fileData, {
    metadata: {
      contentType,
    },
  });

  const [metadata] = await file.getMetadata();

  return metadata as StoredFileMetadata;
}

/**
 * Check whether a Storage object exists.
 *
 * @param {string} filePath Storage object path.
 * @return {Promise<boolean>} True when the file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const [exists] = await bucket.file(filePath).exists();

  return exists;
}

/**
 * Get Storage object metadata.
 *
 * @param {string} filePath Storage object path.
 * @return {Promise<StoredFileMetadata>} File metadata.
 */
export async function getFileMetadata(
  filePath: string
): Promise<StoredFileMetadata> {
  const [metadata] = await bucket.file(filePath).getMetadata();

  return metadata as StoredFileMetadata;
}

/**
 * Download Storage object data.
 *
 * @param {string} filePath Storage object path.
 * @return {Promise<Buffer>} File content.
 */
export async function downloadFile(filePath: string): Promise<Buffer> {
  const [fileData] = await bucket.file(filePath).download();

  return fileData;
}

/**
 * List Storage objects by prefix.
 *
 * @param {string} prefix Storage path prefix.
 * @return {Promise<StoredFileRecord[]>} Matching files.
 */
export async function listFiles(
  prefix: string
): Promise<StoredFileRecord[]> {
  const [files] = await bucket.getFiles({prefix});

  return files.map((file) => ({
    name: file.name,
    metadata: file.metadata as StoredFileMetadata,
  }));
}

/**
 * Delete a Storage object.
 *
 * @param {string} filePath Storage object path.
 */
export async function deleteFile(filePath: string): Promise<void> {
  await bucket.file(filePath).delete();
}

/**
 * Build a gs:// URI for a Storage object path.
 *
 * @param {string} filePath Storage object path.
 * @return {string} Storage URI.
 */
export function getStorageUri(filePath: string): string {
  return `gs://${bucket.name}/${filePath}`;
}
