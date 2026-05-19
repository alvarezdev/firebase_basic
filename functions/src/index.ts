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
import {
  type HttpMethod,
  withHttpMethods,
  withHttpRateLimit,
} from "./http";

type HttpHandler = Parameters<typeof withHttpRateLimit>[1];

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
 * Apply shared HTTP protections to an endpoint.
 *
 * @param {string} operation Operation name.
 * @param {HttpMethod[]} methods Allowed HTTP methods.
 * @param {HttpHandler} handler HTTP handler.
 * @return {HttpHandler} Protected HTTP handler.
 */
function httpEndpoint(
  operation: string,
  methods: HttpMethod[],
  handler: HttpHandler
): HttpHandler {
  return withHttpRateLimit(
    operation,
    withHttpMethods(operation, methods, handler)
  );
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
  withHttpMethods("helloHttp", ["GET"], async (req, res) => {
    const result = await getHelloMessage();
    res.json(result);
  })
));

// ============ AUTH ENDPOINTS ============

export const registerUser = onRequest(
  httpsOptions,
  httpEndpoint("registerUser", ["POST"], registerUserHandler)
);
export const createActivationCode = onRequest(
  httpsOptions,
  httpEndpoint("createActivationCode", ["POST"], createActivationCodeHandler)
);
export const getCurrentUser = onRequest(
  httpsOptions,
  httpEndpoint("getCurrentUser", ["GET"], getCurrentUserHandler)
);
export const logoutUser = onRequest(
  httpsOptions,
  httpEndpoint("logoutUser", ["POST"], logoutUserHandler)
);
export const setUserRole = onRequest(
  httpsOptions,
  httpEndpoint("setUserRole", ["POST"], setUserRoleHandler)
);
export const getUserRole = onRequest(
  httpsOptions,
  httpEndpoint("getUserRole", ["GET"], getUserRoleHandler)
);
export const listPendingUsers = onRequest(
  httpsOptions,
  httpEndpoint("listPendingUsers", ["GET"], listPendingUsersHandler)
);

// ============ FIRESTORE ENDPOINTS ============

export const createItem = onRequest(
  httpsOptions,
  httpEndpoint("createItem", ["POST"], createItemHandler)
);
export const getAllItems = onRequest(
  httpsOptions,
  httpEndpoint("getAllItems", ["GET"], getAllItemsHandler)
);
export const getItemById = onRequest(
  httpsOptions,
  httpEndpoint("getItemById", ["GET"], getItemByIdHandler)
);
export const updateItem = onRequest(
  httpsOptions,
  httpEndpoint("updateItem", ["PATCH"], updateItemHandler)
);
export const deleteItem = onRequest(
  httpsOptions,
  httpEndpoint("deleteItem", ["DELETE"], deleteItemHandler)
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
  httpEndpoint("uploadFile", ["POST"], uploadFileHandler)
);
export const downloadFile = onRequest(
  httpsOptions,
  httpEndpoint("downloadFile", ["GET"], downloadFileHandler)
);
export const listFiles = onRequest(
  httpsOptions,
  httpEndpoint("listFiles", ["GET"], listFilesHandler)
);
export const deleteFileEndpoint = onRequest(
  httpsOptions,
  httpEndpoint("deleteFile", ["DELETE"], deleteFileHandler)
);
