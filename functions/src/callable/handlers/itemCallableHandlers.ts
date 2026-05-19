import {type CallableRequest} from "firebase-functions/v2/https";
import {firestoreService} from "../../services";
import {notFoundError} from "../../shared";
import {
  createItemSchema,
  itemIdQuerySchema,
  paginationQuerySchema,
  updateItemSchema,
  validateRequest,
} from "../../validation";
import {requireCallableActiveAuth, throwCallableError} from "../";

/**
 * CALLABLE CREATE - Add a new item to Firestore from client SDKs
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<object>} Created item response.
 */
export async function createItemCallHandler(
  request: CallableRequest<unknown>
) {
  const authUser = requireCallableActiveAuth(request);

  try {
    const body = validateRequest(createItemSchema, request.data);
    return await firestoreService.createItem(body, authUser.uid);
  } catch (error) {
    throwCallableError(error, "Failed to create item", {
      operation: "createItemCall",
      uid: authUser.uid,
    });
  }
}

/**
 * CALLABLE READ - Get all items with pagination support
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<object>} Paginated items response.
 */
export async function getAllItemsCallHandler(
  request: CallableRequest<unknown>
) {
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
    throwCallableError(error, "Failed to fetch items", {
      operation: "getAllItemsCall",
      uid: authUser.uid,
    });
  }
}

/**
 * CALLABLE READ - Get a single item by ID
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<object>} Item response.
 */
export async function getItemByIdCallHandler(
  request: CallableRequest<unknown>
) {
  const authUser = requireCallableActiveAuth(request);

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, request.data);
    const result = await firestoreService.getItemById(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw notFoundError("Item not found");
    }

    return result;
  } catch (error) {
    throwCallableError(error, "Failed to fetch item", {
      operation: "getItemByIdCall",
      uid: authUser.uid,
    });
  }
}

/**
 * CALLABLE UPDATE - Update an existing item
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<object>} Updated item response.
 */
export async function updateItemCallHandler(
  request: CallableRequest<unknown>
) {
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
      throw notFoundError("Item not found");
    }

    return result;
  } catch (error) {
    throwCallableError(error, "Failed to update item", {
      operation: "updateItemCall",
      uid: authUser.uid,
    });
  }
}

/**
 * CALLABLE DELETE - Delete an item
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<object>} Delete confirmation response.
 */
export async function deleteItemCallHandler(
  request: CallableRequest<unknown>
) {
  const authUser = requireCallableActiveAuth(request);

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, request.data);
    const result = await firestoreService.deleteItem(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw notFoundError("Item not found");
    }

    return result;
  } catch (error) {
    throwCallableError(error, "Failed to delete item", {
      operation: "deleteItemCall",
      uid: authUser.uid,
    });
  }
}
