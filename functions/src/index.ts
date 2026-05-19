import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, onRequest} from "firebase-functions/v2/https";
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

export const registerUser = onRequest(registerUserHandler);
export const createActivationCode = onRequest(createActivationCodeHandler);
export const getCurrentUser = onRequest(getCurrentUserHandler);
export const logoutUser = onRequest(logoutUserHandler);
export const setUserRole = onRequest(setUserRoleHandler);
export const getUserRole = onRequest(getUserRoleHandler);
export const listPendingUsers = onRequest(listPendingUsersHandler);

// ============ FIRESTORE ENDPOINTS ============

export const createItem = onRequest(createItemHandler);
export const getAllItems = onRequest(getAllItemsHandler);
export const getItemById = onRequest(getItemByIdHandler);
export const updateItem = onRequest(updateItemHandler);
export const deleteItem = onRequest(deleteItemHandler);

// ============ FIRESTORE CALLABLE FUNCTIONS ============

export const createItemCall = onCall(createItemCallHandler);
export const getAllItemsCall = onCall(getAllItemsCallHandler);
export const getItemByIdCall = onCall(getItemByIdCallHandler);
export const updateItemCall = onCall(updateItemCallHandler);
export const deleteItemCall = onCall(deleteItemCallHandler);

// ============ STORAGE ENDPOINTS ============

export const uploadFile = onRequest(uploadFileHandler);
export const downloadFile = onRequest(downloadFileHandler);
export const listFiles = onRequest(listFilesHandler);
export const deleteFileEndpoint = onRequest(deleteFileHandler);
