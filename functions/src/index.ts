import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, onRequest} from "firebase-functions/v2/https";
import {callableOptions, httpsOptions} from "./config/functions";
import {appDependencies} from "./dependencies";
import {
  createItemCallableHandlers,
} from "./callable/handlers";
import {withCallableRateLimit} from "./callable";
import {
  createAuthHandlers,
  createItemHandlers,
  createStorageHandlers,
} from "./http/handlers";
import {
  createHttpAuthGuards,
  type HttpMethod,
  withHttpMethods,
  withHttpRateLimit,
} from "./http";

type HttpHandler = Parameters<typeof withHttpRateLimit>[1];

setGlobalOptions({
  region: "us-central1",
});

const services = appDependencies.services;
const httpAuthGuards = createHttpAuthGuards(services);
const authHandlers = createAuthHandlers({
  authService: services.authService,
  requireAdminAuth: httpAuthGuards.requireAdminAuth,
  requireAuth: httpAuthGuards.requireAuth,
});
const itemHandlers = createItemHandlers({
  firestoreService: services.firestoreService,
  requireActiveAuth: httpAuthGuards.requireActiveAuth,
});
const storageHandlers = createStorageHandlers({
  storageService: services.storageService,
  requireActiveAuth: httpAuthGuards.requireActiveAuth,
});
const itemCallableHandlers = createItemCallableHandlers({
  firestoreService: services.firestoreService,
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
  httpEndpoint("registerUser", ["POST"], authHandlers.registerUserHandler)
);
export const createActivationCode = onRequest(
  httpsOptions,
  httpEndpoint(
    "createActivationCode",
    ["POST"],
    authHandlers.createActivationCodeHandler
  )
);
export const getCurrentUser = onRequest(
  httpsOptions,
  httpEndpoint("getCurrentUser", ["GET"], authHandlers.getCurrentUserHandler)
);
export const logoutUser = onRequest(
  httpsOptions,
  httpEndpoint("logoutUser", ["POST"], authHandlers.logoutUserHandler)
);
export const setUserRole = onRequest(
  httpsOptions,
  httpEndpoint("setUserRole", ["POST"], authHandlers.setUserRoleHandler)
);
export const getUserRole = onRequest(
  httpsOptions,
  httpEndpoint("getUserRole", ["GET"], authHandlers.getUserRoleHandler)
);
export const listPendingUsers = onRequest(
  httpsOptions,
  httpEndpoint(
    "listPendingUsers",
    ["GET"],
    authHandlers.listPendingUsersHandler
  )
);

// ============ FIRESTORE ENDPOINTS ============

export const createItem = onRequest(
  httpsOptions,
  httpEndpoint("createItem", ["POST"], itemHandlers.createItemHandler)
);
export const getAllItems = onRequest(
  httpsOptions,
  httpEndpoint("getAllItems", ["GET"], itemHandlers.getAllItemsHandler)
);
export const getItemById = onRequest(
  httpsOptions,
  httpEndpoint("getItemById", ["GET"], itemHandlers.getItemByIdHandler)
);
export const updateItem = onRequest(
  httpsOptions,
  httpEndpoint("updateItem", ["PATCH"], itemHandlers.updateItemHandler)
);
export const deleteItem = onRequest(
  httpsOptions,
  httpEndpoint("deleteItem", ["DELETE"], itemHandlers.deleteItemHandler)
);

// ============ FIRESTORE CALLABLE FUNCTIONS ============

export const createItemCall = onCall(
  callableOptions,
  withCallableRateLimit(
    "createItemCall",
    itemCallableHandlers.createItemCallHandler
  )
);
export const getAllItemsCall = onCall(
  callableOptions,
  withCallableRateLimit(
    "getAllItemsCall",
    itemCallableHandlers.getAllItemsCallHandler
  )
);
export const getItemByIdCall = onCall(
  callableOptions,
  withCallableRateLimit(
    "getItemByIdCall",
    itemCallableHandlers.getItemByIdCallHandler
  )
);
export const updateItemCall = onCall(
  callableOptions,
  withCallableRateLimit(
    "updateItemCall",
    itemCallableHandlers.updateItemCallHandler
  )
);
export const deleteItemCall = onCall(
  callableOptions,
  withCallableRateLimit(
    "deleteItemCall",
    itemCallableHandlers.deleteItemCallHandler
  )
);

// ============ STORAGE ENDPOINTS ============

export const uploadFile = onRequest(
  httpsOptions,
  httpEndpoint("uploadFile", ["POST"], storageHandlers.uploadFileHandler)
);
export const downloadFile = onRequest(
  httpsOptions,
  httpEndpoint("downloadFile", ["GET"], storageHandlers.downloadFileHandler)
);
export const listFiles = onRequest(
  httpsOptions,
  httpEndpoint("listFiles", ["GET"], storageHandlers.listFilesHandler)
);
export const deleteFileEndpoint = onRequest(
  httpsOptions,
  httpEndpoint("deleteFile", ["DELETE"], storageHandlers.deleteFileHandler)
);
