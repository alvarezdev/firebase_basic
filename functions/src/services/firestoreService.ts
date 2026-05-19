import {itemRepository} from "../repositories";
import {isAdminRole} from "../shared";
import type {CreateItemInput, UpdateItemInput} from "../validation";
import type {ItemRecord} from "../repositories/itemRepository";

export type PaginationMetadata = {
  total: number;
  limit: number;
  offset: number;
  count: number;
};

export type ItemListResponse = {
  data: ItemRecord[];
  pagination: PaginationMetadata;
};

export type DeleteItemResponse = {
  message: string;
  id: string;
};

/**
 * CREATE - Add a new item to Firestore
 *
 * @param {CreateItemInput} itemData Data to store in the item document.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<ItemRecord>} Created item with generated Firestore ID.
 */
export async function createItem(
  itemData: CreateItemInput,
  ownerId: string
): Promise<ItemRecord> {
  const data = {
    ...itemData,
    ownerId,
  };

  return await itemRepository.createItem(data);
}

/**
 * READ - Get all items with pagination support
 *
 * @param {number} limit Maximum number of items to return.
 * @param {number} offset Number of items to skip.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<ItemListResponse>} Items and pagination metadata.
 */
export async function getAllItems(
  limit: number,
  offset: number,
  ownerId: string,
  role: unknown
): Promise<ItemListResponse> {
  const ownerFilter = isAdminRole(role) ? undefined : ownerId;
  const [total, items] = await Promise.all([
    itemRepository.countItems(ownerFilter),
    itemRepository.listItems(limit, offset, ownerFilter),
  ]);

  return {
    data: items,
    pagination: {
      total,
      limit,
      offset,
      count: items.length,
    },
  };
}

/**
 * READ - Get a single item by ID
 *
 * @param {string} itemId Firestore document ID.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<ItemRecord | null>} Item data, or null if missing.
 */
export async function getItemById(
  itemId: string,
  ownerId: string,
  role: unknown
): Promise<ItemRecord | null> {
  const item = await itemRepository.findItemById(itemId);

  if (!item || (!isAdminRole(role) && item.ownerId !== ownerId)) {
    return null;
  }

  return item;
}

/**
 * UPDATE - Update an existing item
 *
 * @param {string} itemId Firestore document ID.
 * @param {UpdateItemInput} updateData Partial data to update.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<ItemRecord | null>} Updated item, or null if missing.
 */
export async function updateItem(
  itemId: string,
  updateData: UpdateItemInput,
  ownerId: string,
  role: unknown
): Promise<ItemRecord | null> {
  const item = await itemRepository.findItemById(itemId);

  if (!item || (!isAdminRole(role) && item.ownerId !== ownerId)) {
    return null;
  }

  await itemRepository.updateItem(itemId, updateData);

  return await itemRepository.findItemById(itemId);
}

/**
 * DELETE - Delete an item
 *
 * @param {string} itemId Firestore document ID.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<DeleteItemResponse | null>} Delete confirmation, or null.
 */
export async function deleteItem(
  itemId: string,
  ownerId: string,
  role: unknown
): Promise<DeleteItemResponse | null> {
  const item = await itemRepository.findItemById(itemId);

  if (!item || (!isAdminRole(role) && item.ownerId !== ownerId)) {
    return null;
  }

  await itemRepository.deleteItem(itemId);

  return {
    message: "Item deleted successfully",
    id: itemId,
  };
}
