import {type CallableRequest} from "firebase-functions/v2/https";
import {firestoreService} from "../../services";
import {logInfo, notFoundError} from "../../shared";
import type {
  DeleteItemResponse,
  ItemListResponse,
} from "../../services/firestoreService";
import type {ItemRecord} from "../../repositories/itemRepository";
import {
  createItemSchema,
  itemIdQuerySchema,
  paginationQuerySchema,
  updateItemSchema,
  validateRequest,
} from "../../validation";
import {
  getCallablePayload,
  requireCallableActiveAuth,
  throwCallableError,
} from "../";

/**
 * CALLABLE CREATE - Add a new item to Firestore from client SDKs
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<ItemRecord>} Created item response.
 */
export async function createItemCallHandler(
  request: CallableRequest<unknown>
): Promise<ItemRecord> {
  const authUser = await requireCallableActiveAuth(request);

  try {
    const body = validateRequest(
      createItemSchema,
      getCallablePayload(request.data)
    );
    const result = await firestoreService.createItem(body, authUser.uid);
    logInfo("Item created", {
      transport: "callable",
      operation: "createItemCall",
      uid: authUser.uid,
      itemId: result.id,
    });
    return result;
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
 * @return {Promise<ItemListResponse>} Paginated items response.
 */
export async function getAllItemsCallHandler(
  request: CallableRequest<unknown>
): Promise<ItemListResponse> {
  const authUser = await requireCallableActiveAuth(request);

  try {
    const {limit, offset} = validateRequest(
      paginationQuerySchema,
      getCallablePayload(request.data) || {}
    );

    const result = await firestoreService.getAllItems(
      limit,
      offset,
      authUser.uid,
      authUser.role
    );
    logInfo("Items listed", {
      transport: "callable",
      operation: "getAllItemsCall",
      uid: authUser.uid,
      role: authUser.role,
      count: result.pagination.count,
      total: result.pagination.total,
      limit,
      offset,
    });
    return result;
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
 * @return {Promise<ItemRecord>} Item response.
 */
export async function getItemByIdCallHandler(
  request: CallableRequest<unknown>
): Promise<ItemRecord> {
  const authUser = await requireCallableActiveAuth(request);

  try {
    const {id: itemId} = validateRequest(
      itemIdQuerySchema,
      getCallablePayload(request.data)
    );
    const result = await firestoreService.getItemById(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw notFoundError("Item not found");
    }

    logInfo("Item fetched", {
      transport: "callable",
      operation: "getItemByIdCall",
      uid: authUser.uid,
      itemId,
    });
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
 * @return {Promise<ItemRecord>} Updated item response.
 */
export async function updateItemCallHandler(
  request: CallableRequest<unknown>
): Promise<ItemRecord> {
  const authUser = await requireCallableActiveAuth(request);

  try {
    const updatePayload = {
      ...getCallablePayload(request.data) as Record<string, unknown>,
    };
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

    logInfo("Item updated", {
      transport: "callable",
      operation: "updateItemCall",
      uid: authUser.uid,
      itemId,
    });
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
 * @return {Promise<DeleteItemResponse>} Delete confirmation response.
 */
export async function deleteItemCallHandler(
  request: CallableRequest<unknown>
): Promise<DeleteItemResponse> {
  const authUser = await requireCallableActiveAuth(request);

  try {
    const {id: itemId} = validateRequest(
      itemIdQuerySchema,
      getCallablePayload(request.data)
    );
    const result = await firestoreService.deleteItem(
      itemId,
      authUser.uid,
      authUser.role
    );

    if (!result) {
      throw notFoundError("Item not found");
    }

    logInfo("Item deleted", {
      transport: "callable",
      operation: "deleteItemCall",
      uid: authUser.uid,
      itemId,
    });
    return result;
  } catch (error) {
    throwCallableError(error, "Failed to delete item", {
      operation: "deleteItemCall",
      uid: authUser.uid,
    });
  }
}
