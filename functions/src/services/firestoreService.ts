import {itemRepository} from "../repositories";
import type {CreateItemInput, UpdateItemInput} from "../validation";

/**
 * Check whether a user role has admin permissions.
 *
 * @param {unknown} role Role claim from the Firebase ID token.
 * @return {boolean} True when the role is admin.
 */
function isAdmin(role: unknown) {
  return role === "admin";
}

/**
 * CREATE - Add a new item to Firestore
 *
 * @param {any} itemData Data to store in the item document.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<object>} Created item with generated Firestore ID.
 */
export async function createItem(
  itemData: CreateItemInput,
  ownerId: string
) {
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
 * @return {Promise<object>} Items and pagination metadata.
 */
export async function getAllItems(
  limit: number,
  offset: number,
  ownerId: string,
  role: unknown
) {
  const ownerFilter = isAdmin(role) ? undefined : ownerId;
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
 * @return {Promise<object | null>} Item data, or null if it does not exist.
 */
export async function getItemById(
  itemId: string,
  ownerId: string,
  role: unknown
) {
  const item = await itemRepository.findItemById(itemId);

  if (!item || (!isAdmin(role) && item.ownerId !== ownerId)) {
    return null;
  }

  return item;
}

/**
 * UPDATE - Update an existing item
 *
 * @param {string} itemId Firestore document ID.
 * @param {any} updateData Partial data to update.
 * @param {string} ownerId Authenticated user ID.
 * @param {unknown} role Authenticated user role.
 * @return {Promise<object | null>} Updated item, or null if it does not exist.
 */
export async function updateItem(
  itemId: string,
  updateData: UpdateItemInput,
  ownerId: string,
  role: unknown
) {
  const item = await itemRepository.findItemById(itemId);

  if (!item || (!isAdmin(role) && item.ownerId !== ownerId)) {
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
 * @return {Promise<object | null>} Delete confirmation, or null if missing.
 */
export async function deleteItem(
  itemId: string,
  ownerId: string,
  role: unknown
) {
  const item = await itemRepository.findItemById(itemId);

  if (!item || (!isAdmin(role) && item.ownerId !== ownerId)) {
    return null;
  }

  await itemRepository.deleteItem(itemId);

  return {
    message: "Item deleted successfully",
    id: itemId,
  };
}
