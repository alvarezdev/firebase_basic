import {RequestValidationError} from "../../validation";

const maxUploadBytes = 5 * 1024 * 1024;
const allowedUploadContentTypes = [
  "application/json",
  "application/pdf",
  "text/plain",
];

/**
 * Get the upload payload size in bytes.
 *
 * @param {unknown} fileData Incoming upload data.
 * @return {number} Payload size in bytes.
 */
function getUploadSize(fileData: unknown) {
  if (Buffer.isBuffer(fileData)) {
    return fileData.length;
  }

  if (typeof fileData === "string") {
    return Buffer.byteLength(fileData);
  }

  return 0;
}

/**
 * Validate upload body before saving it to Storage.
 *
 * @param {unknown} fileData Incoming upload data.
 * @return {Buffer | string} Validated upload data.
 */
export function validateUploadData(fileData: unknown): Buffer | string {
  if (!Buffer.isBuffer(fileData) && typeof fileData !== "string") {
    throw new RequestValidationError([
      "body: File data must be text or binary",
    ]);
  }

  const uploadSize = getUploadSize(fileData);

  if (uploadSize === 0) {
    throw new RequestValidationError(["body: File data is required"]);
  }

  if (uploadSize > maxUploadBytes) {
    throw new RequestValidationError([
      "body: File data must not be larger than 5MB",
    ]);
  }

  return fileData;
}

/**
 * Validate upload content type before saving it to Storage.
 *
 * @param {string | undefined} contentType Incoming content type.
 * @return {string} Validated content type.
 */
export function validateUploadContentType(contentType: string | undefined) {
  const normalizedContentType = (contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (
    allowedUploadContentTypes.includes(normalizedContentType) ||
    normalizedContentType.startsWith("image/")
  ) {
    return normalizedContentType;
  }

  throw new RequestValidationError([
    "content-type: File type must be text/plain, application/json, " +
      "application/pdf, or image/*",
  ]);
}
