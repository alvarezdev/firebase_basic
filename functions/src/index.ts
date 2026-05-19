import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, onRequest} from "firebase-functions/v2/https";
import {callableOptions, httpsOptions} from "./config/functions";
import {
  createItemCallHandler,
  deleteItemCallHandler,
  getAllItemsCallHandler,
  getItemByIdCallHandler,
  updateItemCallHandler,
} from "./callable/handlers";
import {
  createActivationCodeHandler,
  createItemHandler,
  deleteFileHandler,
  deleteItemHandler,
  downloadFileHandler,
  getAllItemsHandler,
  getCurrentUserHandler,
  getItemByIdHandler,
  getUserRoleHandler,
  listFilesHandler,
  listPendingUsersHandler,
  logoutUserHandler,
  registerUserHandler,
  setUserRoleHandler,
  updateItemHandler,
  uploadFileHandler,
} from "./http/handlers";

setGlobalOptions({
  region: "us-central1",
});

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
export const helloCall = onCall(callableOptions, async () => {
  return await getHelloMessage();
});

/**
 * HTTP function - invoke via HTTP request/response
 */
export const helloHttp = onRequest(httpsOptions, async (req, res) => {
  const result = await getHelloMessage();
  res.json(result);
});

// ============ AUTH ENDPOINTS ============

export const registerUser = onRequest(httpsOptions, registerUserHandler);
export const createActivationCode = onRequest(
  httpsOptions,
  createActivationCodeHandler
);
export const getCurrentUser = onRequest(httpsOptions, getCurrentUserHandler);
export const logoutUser = onRequest(httpsOptions, logoutUserHandler);
export const setUserRole = onRequest(httpsOptions, setUserRoleHandler);
export const getUserRole = onRequest(httpsOptions, getUserRoleHandler);
export const listPendingUsers = onRequest(
  httpsOptions,
  listPendingUsersHandler
);

// ============ FIRESTORE ENDPOINTS ============

export const createItem = onRequest(httpsOptions, createItemHandler);
export const getAllItems = onRequest(httpsOptions, getAllItemsHandler);
export const getItemById = onRequest(httpsOptions, getItemByIdHandler);
export const updateItem = onRequest(httpsOptions, updateItemHandler);
export const deleteItem = onRequest(httpsOptions, deleteItemHandler);

// ============ FIRESTORE CALLABLE FUNCTIONS ============

export const createItemCall = onCall(callableOptions, createItemCallHandler);
export const getAllItemsCall = onCall(callableOptions, getAllItemsCallHandler);
export const getItemByIdCall = onCall(callableOptions, getItemByIdCallHandler);
export const updateItemCall = onCall(callableOptions, updateItemCallHandler);
export const deleteItemCall = onCall(callableOptions, deleteItemCallHandler);

// ============ STORAGE ENDPOINTS ============

export const uploadFile = onRequest(httpsOptions, uploadFileHandler);
export const downloadFile = onRequest(httpsOptions, downloadFileHandler);
export const listFiles = onRequest(httpsOptions, listFilesHandler);
export const deleteFileEndpoint = onRequest(httpsOptions, deleteFileHandler);
