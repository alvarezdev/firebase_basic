import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {storageService} from "../../services";
import {notFoundError} from "../../shared";
import {
  filenameQuerySchema,
  uploadFileQuerySchema,
  validateRequest,
} from "../../validation";
import {requireActiveAuth, sendErrorResponse} from "../";
import {
  validateUploadContentType,
  validateUploadData,
} from "../../storage/uploadValidation";

/**
 * UPLOAD - Upload a file to Cloud Storage
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function uploadFileHandler(req: Request, res: Response) {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {filename: requestedFilename} = validateRequest(
      uploadFileQuerySchema,
      req.query
    );
    let filename = requestedFilename;
    const contentType = validateUploadContentType(req.get("content-type"));

    if (!filename) {
      filename = `file-${Date.now()}-${
        Math.random().toString(36).substring(7)
      }`;
    }

    const fileData = validateUploadData(req.body);
    const result = await storageService.uploadFile(
      filename,
      fileData,
      contentType,
      authUser.uid
    );
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to upload file", 500, {
      operation: "uploadFile",
      uid: authUser.uid,
    });
  }
}

/**
 * DOWNLOAD - Download a file from Cloud Storage
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function downloadFileHandler(req: Request, res: Response) {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {filename} = validateRequest(filenameQuerySchema, req.query);
    const result = await storageService.downloadFile(
      filename,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      sendErrorResponse(
        res,
        notFoundError("File not found"),
        "File not found",
        404,
        {operation: "downloadFile", uid: authUser.uid, filename}
      );
      return;
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.data);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to download file", 500, {
      operation: "downloadFile",
      uid: authUser.uid,
    });
  }
}

/**
 * LIST - List all files in Cloud Storage
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function listFilesHandler(req: Request, res: Response) {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const result = await storageService.listFiles(authUser.uid, authUser.role);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to list files", 500, {
      operation: "listFiles",
      uid: authUser.uid,
    });
  }
}

/**
 * DELETE - Delete a file from Cloud Storage
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function deleteFileHandler(req: Request, res: Response) {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {filename} = validateRequest(filenameQuerySchema, req.query);
    const result = await storageService.deleteFile(
      filename,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      sendErrorResponse(
        res,
        notFoundError("File not found"),
        "File not found",
        404,
        {operation: "deleteFile", uid: authUser.uid, filename}
      );
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to delete file", 500, {
      operation: "deleteFile",
      uid: authUser.uid,
    });
  }
}
