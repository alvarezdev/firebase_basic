import type {DecodedIdToken} from "firebase-admin/auth";
import type {Response} from "express";
import {onCall, onRequest, type Request} from "firebase-functions/v2/https";
import {authService, firestoreService, storageService} from "./services";

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
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({error: "Failed to register user"});
  }
});

/**
 * ACTIVATION CODE - Simulate payment provider generating an admin code
 */
export const createActivationCode = onRequest(async (req, res) => {
  try {
    const result = await authService.createActivationCode(
      req.body,
      req.get("x-payment-secret")
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(403).json({error: "Failed to create activation code"});
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
    res.status(401).json({error: "Authentication required"});
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
    res.status(401).json({error: "Authentication required"});
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
    const result = await authService.setUserRole(req.body, authUser.uid);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({error: "Failed to set user role"});
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
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({error: "UID is required"});
      return;
    }

    if (authUser.uid !== uid && !authService.isAdminRole(authUser.role)) {
      res.status(403).json({error: "Admin role required"});
      return;
    }

    const result = await authService.getUserRole(uid);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({error: "Failed to get user role"});
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
    res.status(400).json({error: "Failed to list pending users"});
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
    const result = await firestoreService.createItem(req.body, authUser.uid);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({error: "Failed to create item"});
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
    let limit = parseInt(req.query.limit as string) || 10;
    let offset = parseInt(req.query.offset as string) || 0;

    // Validate and constrain limit
    if (limit < 1 || limit > 100) {
      limit = 10;
    }
    if (offset < 0) {
      offset = 0;
    }

    const result = await firestoreService.getAllItems(
      limit,
      offset,
      authUser.uid,
      authUser.role
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({error: "Failed to fetch items"});
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
    const itemId = req.query.id as string;

    if (!itemId) {
      res.status(400).json({error: "Item ID is required"});
      return;
    }

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
    res.status(400).json({error: "Failed to fetch item"});
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
    const itemId = req.query.id as string;
    const updateData = req.body;

    if (!itemId) {
      res.status(400).json({error: "Item ID is required"});
      return;
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      res.status(400).json({error: "Update data is required"});
      return;
    }

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
    res.status(400).json({error: "Failed to update item"});
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
    const itemId = req.query.id as string;

    if (!itemId) {
      res.status(400).json({error: "Item ID is required"});
      return;
    }

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
    res.status(400).json({error: "Failed to delete item"});
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
    let filename = req.query.filename as string;
    const contentType = req.get("content-type");

    // Generate filename if not provided
    if (!filename) {
      filename = `file-${Date.now()}-${
        Math.random().toString(36).substring(7)
      }`;
    }

    if (!req.body || req.body.length === 0) {
      res.status(400).json({error: "File data is required"});
      return;
    }

    const result = await storageService.uploadFile(
      filename,
      req.body,
      contentType,
      authUser.uid
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({error: "Failed to upload file"});
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
    const filename = req.query.filename as string;

    if (!filename) {
      res.status(400).json({error: "Filename is required"});
      return;
    }

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
    res.status(400).json({error: "Failed to download file"});
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
    res.status(400).json({error: "Failed to list files"});
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
    const filename = req.query.filename as string;

    if (!filename) {
      res.status(400).json({error: "Filename is required"});
      return;
    }

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
    res.status(400).json({error: "Failed to delete file"});
  }
});
