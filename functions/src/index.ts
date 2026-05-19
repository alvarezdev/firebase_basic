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
import {withCallableRateLimit} from "./callable";
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
import {withHttpRateLimit} from "./http";

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
export const helloCall = onCall(callableOptions, withCallableRateLimit(
  "helloCall",
  async () => {
    return await getHelloMessage();
  }
));

/**
 * HTTP function - invoke via HTTP request/response
 */
export const helloHttp = onRequest(httpsOptions, withHttpRateLimit(
  "helloHttp",
  async (req, res) => {
    const result = await getHelloMessage();
    res.json(result);
  }
));

// ============ AUTH ENDPOINTS ============

export const registerUser = onRequest(
  httpsOptions,
  withHttpRateLimit("registerUser", registerUserHandler)
);
export const createActivationCode = onRequest(
  httpsOptions,
  withHttpRateLimit("createActivationCode", createActivationCodeHandler)
);
export const getCurrentUser = onRequest(
  httpsOptions,
  withHttpRateLimit("getCurrentUser", getCurrentUserHandler)
);
export const logoutUser = onRequest(
  httpsOptions,
  withHttpRateLimit("logoutUser", logoutUserHandler)
);
export const setUserRole = onRequest(
  httpsOptions,
  withHttpRateLimit("setUserRole", setUserRoleHandler)
);
export const getUserRole = onRequest(
  httpsOptions,
  withHttpRateLimit("getUserRole", getUserRoleHandler)
);
export const listPendingUsers = onRequest(
  httpsOptions,
  withHttpRateLimit("listPendingUsers", listPendingUsersHandler)
);

// ============ FIRESTORE ENDPOINTS ============

export const createItem = onRequest(
  httpsOptions,
  withHttpRateLimit("createItem", createItemHandler)
);
export const getAllItems = onRequest(
  httpsOptions,
  withHttpRateLimit("getAllItems", getAllItemsHandler)
);
export const getItemById = onRequest(
  httpsOptions,
  withHttpRateLimit("getItemById", getItemByIdHandler)
);
export const updateItem = onRequest(
  httpsOptions,
  withHttpRateLimit("updateItem", updateItemHandler)
);
export const deleteItem = onRequest(
  httpsOptions,
  withHttpRateLimit("deleteItem", deleteItemHandler)
);

// ============ FIRESTORE CALLABLE FUNCTIONS ============

export const createItemCall = onCall(
  callableOptions,
  withCallableRateLimit("createItemCall", createItemCallHandler)
);
export const getAllItemsCall = onCall(
  callableOptions,
  withCallableRateLimit("getAllItemsCall", getAllItemsCallHandler)
);
export const getItemByIdCall = onCall(
  callableOptions,
  withCallableRateLimit("getItemByIdCall", getItemByIdCallHandler)
);
export const updateItemCall = onCall(
  callableOptions,
  withCallableRateLimit("updateItemCall", updateItemCallHandler)
);
export const deleteItemCall = onCall(
  callableOptions,
  withCallableRateLimit("deleteItemCall", deleteItemCallHandler)
);

// ============ STORAGE ENDPOINTS ============

export const uploadFile = onRequest(
  httpsOptions,
  withHttpRateLimit("uploadFile", uploadFileHandler)
);
export const downloadFile = onRequest(
  httpsOptions,
  withHttpRateLimit("downloadFile", downloadFileHandler)
);
export const listFiles = onRequest(
  httpsOptions,
  withHttpRateLimit("listFiles", listFilesHandler)
);
export const deleteFileEndpoint = onRequest(
  httpsOptions,
  withHttpRateLimit("deleteFile", deleteFileHandler)
);
