import type {DecodedIdToken} from "firebase-admin/auth";
import type {Response} from "express";
import {
  HttpsError,
  onCall,
  onRequest,
  type CallableRequest,
  type Request,
} from "firebase-functions/v2/https";
import {authService, firestoreService, storageService} from "./services";
import {
  RequestValidationError,
  createActivationCodeSchema,
  createItemSchema,
  filenameQuerySchema,
  isRequestValidationError,
  itemIdQuerySchema,
  paginationQuerySchema,
  registerUserSchema,
  setUserRoleSchema,
  uidQuerySchema,
  updateItemSchema,
  uploadFileQuerySchema,
  validateRequest,
} from "./validation";

const maxUploadBytes = 5 * 1024 * 1024;

type CallableAuthUser = {
  uid: string;
  role: unknown;
};

/**
 * Send a validation-aware error response.
 *
 * @param {Response} res HTTP response.
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback error message.
 * @param {number} statusCode Fallback HTTP status code.
 */
function sendErrorResponse(
  res: Response,
  error: unknown,
  fallbackMessage: string,
  statusCode = 400
) {
  if (isRequestValidationError(error)) {
    res.status(400).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  res.status(statusCode).json({error: fallbackMessage});
}

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
function validateUploadData(fileData: unknown): Buffer | string {
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
 * Require a valid Firebase Auth ID token for HTTP endpoints.
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 * @return {Promise<DecodedIdToken | null>} Authenticated user claims.
 */
async function requireAuth(
  req: Request,
  res: Response
): Promise<DecodedIdToken | null> {
  try {
    return await authService.verifyIdToken(req.get("authorization"));
  } catch (error) {
    res.status(401).json({error: "Authentication required"});
    return null;
  }
}

/**
 * Require an authenticated user with an active application role.
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 * @return {Promise<DecodedIdToken | null>} Authenticated user claims.
 */
async function requireActiveAuth(
  req: Request,
  res: Response
): Promise<DecodedIdToken | null> {
  const authUser = await requireAuth(req, res);

  if (!authUser) {
    return null;
  }

  if (!authService.isActiveRole(authUser.role)) {
    res.status(403).json({error: "Active user role required"});
    return null;
  }

  return authUser;
}

/**
 * Require an authenticated user with admin permissions.
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 * @return {Promise<DecodedIdToken | null>} Authenticated admin claims.
 */
async function requireAdminAuth(
  req: Request,
  res: Response
): Promise<DecodedIdToken | null> {
  const authUser = await requireAuth(req, res);

  if (!authUser) {
    return null;
  }

  if (!authService.isAdminRole(authUser.role)) {
    res.status(403).json({error: "Admin role required"});
    return null;
  }

  return authUser;
}

/**
 * Convert validation and service errors to callable errors.
 *
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback error message.
 */
function throwCallableError(error: unknown, fallbackMessage: string): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (isRequestValidationError(error)) {
    throw new HttpsError("invalid-argument", error.message, {
      details: error.details,
    });
  }

  throw new HttpsError("internal", fallbackMessage);
}

/**
 * Require a valid Firebase Auth context for callable functions.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {CallableAuthUser} Authenticated callable user.
 */
function requireCallableAuth(
  request: CallableRequest<unknown>
): CallableAuthUser {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  return {
    uid: request.auth.uid,
    role: request.auth.token.role,
  };
}

/**
 * Require an active user role for callable functions.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {CallableAuthUser} Authenticated active user.
 */
function requireCallableActiveAuth(
  request: CallableRequest<unknown>
): CallableAuthUser {
  const authUser = requireCallableAuth(request);

  if (!authService.isActiveRole(authUser.role)) {
    throw new HttpsError("permission-denied", "Active user role required");
  }

  return authUser;
}

/**
 * Shared business logic
 * Returns a greeting message
 */
async function getHelloMessage() {
  return {message: "Hola 🚀"};
}

/**
 * Callable function - invoke directly from client SDK
 */
export const helloCall = onCall(async () => {
  return await getHelloMessage();
});

/**
 * HTTP function - invoke via HTTP request/response
 */
export const helloHttp = onRequest(async (req, res) => {
  const result = await getHelloMessage();
  res.json(result);
});

// ============ AUTH ENDPOINTS ============

/**
 * REGISTER - Create a new Firebase Auth user
 */
export const registerUser = onRequest(async (req, res) => {
  try {
    const body = validateRequest(registerUserSchema, req.body);
    const result = await authService.registerUser(body);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to register user");
  }
});

/**
 * ACTIVATION CODE - Simulate payment provider generating an admin code
 */
export const createActivationCode = onRequest(async (req, res) => {
  try {
    const body = validateRequest(createActivationCodeSchema, req.body);
    const result = await authService.createActivationCode(
      body,
      req.get("x-payment-secret")
    );
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create activation code", 403);
  }
});

/**
 * CURRENT USER - Get authenticated user profile from ID token
 */
export const getCurrentUser = onRequest(async (req, res) => {
  try {
    const result = await authService.getCurrentUser(req.get("authorization"));
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Authentication required", 401);
  }
});

/**
 * LOGOUT - Revoke refresh tokens for authenticated user
 */
export const logoutUser = onRequest(async (req, res) => {
  try {
    const result = await authService.logoutUser(req.get("authorization"));
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Authentication required", 401);
  }
});

/**
 * SET ROLE - Assign a basic role custom claim to a user
 */
export const setUserRole = onRequest(async (req, res) => {
  const authUser = await requireAdminAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const body = validateRequest(setUserRoleSchema, req.body);
    const result = await authService.setUserRole(body, authUser.uid);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to set user role");
  }
});

/**
 * GET ROLE - Get a user's assigned role
 */
export const getUserRole = onRequest(async (req, res) => {
  const authUser = await requireAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {uid} = validateRequest(uidQuerySchema, req.query);

    if (authUser.uid !== uid && !authService.isAdminRole(authUser.role)) {
      res.status(403).json({error: "Admin role required"});
      return;
    }

    const result = await authService.getUserRole(uid);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get user role");
  }
});

/**
 * PENDING USERS - List users waiting for admin approval
 */
export const listPendingUsers = onRequest(async (req, res) => {
  const authUser = await requireAdminAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const result = await authService.listPendingUsers();
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to list pending users");
  }
});

// ============ FIRESTORE ENDPOINTS ============

/**
 * CREATE - Add a new item to Firestore
 */
export const createItem = onRequest(async (req, res) => {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const body = validateRequest(createItemSchema, req.body);
    const result = await firestoreService.createItem(body, authUser.uid);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create item");
  }
});

/**
 * READ - Get all items with pagination support
 */
export const getAllItems = onRequest(async (req, res) => {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {limit, offset} = validateRequest(paginationQuerySchema, req.query);

    const result = await firestoreService.getAllItems(
      limit,
      offset,
      authUser.uid,
      authUser.role
    );
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to fetch items");
  }
});

/**
 * READ - Get a single item by ID
 */
export const getItemById = onRequest(async (req, res) => {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);

    const result = await firestoreService.getItemById(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      res.status(404).json({error: "Item not found"});
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to fetch item");
  }
});

/**
 * UPDATE - Update an existing item
 */
export const updateItem = onRequest(async (req, res) => {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);
    const updateData = validateRequest(updateItemSchema, req.body);

    const result = await firestoreService.updateItem(
      itemId,
      updateData,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      res.status(404).json({error: "Item not found"});
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to update item");
  }
});

/**
 * DELETE - Delete an item
 */
export const deleteItem = onRequest(async (req, res) => {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);

    const result = await firestoreService.deleteItem(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      res.status(404).json({error: "Item not found"});
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to delete item");
  }
});

// ============ FIRESTORE CALLABLE FUNCTIONS ============

/**
 * CALLABLE CREATE - Add a new item to Firestore from client SDKs
 */
export const createItemCall = onCall(async (request) => {
  const authUser = requireCallableActiveAuth(request);

  try {
    const body = validateRequest(createItemSchema, request.data);
    return await firestoreService.createItem(body, authUser.uid);
  } catch (error) {
    throwCallableError(error, "Failed to create item");
  }
});

/**
 * CALLABLE READ - Get all items with pagination support
 */
export const getAllItemsCall = onCall(async (request) => {
  const authUser = requireCallableActiveAuth(request);

  try {
    const {limit, offset} = validateRequest(
      paginationQuerySchema,
      request.data || {}
    );

    return await firestoreService.getAllItems(
      limit,
      offset,
      authUser.uid,
      authUser.role
    );
  } catch (error) {
    throwCallableError(error, "Failed to fetch items");
  }
});

/**
 * CALLABLE READ - Get a single item by ID
 */
export const getItemByIdCall = onCall(async (request) => {
  const authUser = requireCallableActiveAuth(request);

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, request.data);
    const result = await firestoreService.getItemById(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw new HttpsError("not-found", "Item not found");
    }

    return result;
  } catch (error) {
    throwCallableError(error, "Failed to fetch item");
  }
});

/**
 * CALLABLE UPDATE - Update an existing item
 */
export const updateItemCall = onCall(async (request) => {
  const authUser = requireCallableActiveAuth(request);

  try {
    const updatePayload = {...request.data as Record<string, unknown>};
    const {id: itemId} = validateRequest(itemIdQuerySchema, {
      id: updatePayload.id,
    });
    delete updatePayload.id;
    const updateData = validateRequest(updateItemSchema, updatePayload);
    const result = await firestoreService.updateItem(
      itemId,
      updateData,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw new HttpsError("not-found", "Item not found");
    }

    return result;
  } catch (error) {
    throwCallableError(error, "Failed to update item");
  }
});

/**
 * CALLABLE DELETE - Delete an item
 */
export const deleteItemCall = onCall(async (request) => {
  const authUser = requireCallableActiveAuth(request);

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, request.data);
    const result = await firestoreService.deleteItem(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw new HttpsError("not-found", "Item not found");
    }

    return result;
  } catch (error) {
    throwCallableError(error, "Failed to delete item");
  }
});

// ============ STORAGE ENDPOINTS ============

/**
 * UPLOAD - Upload a file to Cloud Storage
 */
export const uploadFile = onRequest(async (req, res) => {
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
    const contentType = req.get("content-type");

    // Generate filename if not provided
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
    sendErrorResponse(res, error, "Failed to upload file");
  }
});

/**
 * DOWNLOAD - Download a file from Cloud Storage
 */
export const downloadFile = onRequest(async (req, res) => {
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
      res.status(404).json({error: "File not found"});
      return;
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.data);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to download file");
  }
});

/**
 * LIST - List all files in Cloud Storage
 */
export const listFiles = onRequest(async (req, res) => {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const result = await storageService.listFiles(authUser.uid, authUser.role);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to list files");
  }
});

/**
 * DELETE - Delete a file from Cloud Storage
 */
export const deleteFileEndpoint = onRequest(async (req, res) => {
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
      res.status(404).json({error: "File not found"});
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to delete file");
  }
});
