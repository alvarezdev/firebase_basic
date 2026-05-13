import {db} from "../config/firebase";

const itemsCollection = db.collection("items");

/**
 * CREATE - Add a new item to Firestore
 *
 * @param {any} itemData Data to store in the item document.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<object>} Created item with generated Firestore ID.
 */
export async function createItem(
  itemData: Record<string, unknown>,
  ownerId: string
) {
  const data = {
    ...itemData,
    ownerId,
  };
  const docRef = await itemsCollection.add(data);
  return {
    id: docRef.id,
    ...data,
  };
}

/**
 * READ - Get all items with pagination support
 *
 * @param {number} limit Maximum number of items to return.
 * @param {number} offset Number of items to skip.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<object>} Items and pagination metadata.
 */
export async function getAllItems(
  limit: number,
  offset: number,
  ownerId: string
) {
  const ownerItemsQuery = itemsCollection.where("ownerId", "==", ownerId);

  // Get total count of items
  const totalSnapshot = await ownerItemsQuery.count().get();
  const total = totalSnapshot.data().count;

  // Get paginated items
  const snapshot = await ownerItemsQuery
    .limit(limit + offset)
    .get();

  // Apply offset to results
  const items = snapshot.docs
    .slice(offset, offset + limit)
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
 * @return {Promise<object | null>} Item data, or null if it does not exist.
 */
export async function getItemById(itemId: string, ownerId: string) {
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

  const itemData = doc.data();

  if (itemData?.ownerId !== ownerId) {
    return null;
  }

  return {
    id: doc.id,
    ...itemData,
  };
}

/**
 * UPDATE - Update an existing item
 *
 * @param {string} itemId Firestore document ID.
 * @param {any} updateData Partial data to update.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<object | null>} Updated item, or null if it does not exist.
 */
export async function updateItem(
  itemId: string,
  updateData: Record<string, unknown>,
  ownerId: string
) {
  // Check if document exists
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

  const itemData = doc.data();

  if (itemData?.ownerId !== ownerId) {
    return null;
  }

  delete updateData.ownerId;

  // Update the document
  await itemsCollection.doc(itemId).update(updateData);

  // Fetch and return the updated document
  const updatedDoc = await itemsCollection.doc(itemId).get();

  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  };
}

/**
 * DELETE - Delete an item
 *
 * @param {string} itemId Firestore document ID.
 * @param {string} ownerId Authenticated user ID.
 * @return {Promise<object | null>} Delete confirmation, or null if missing.
 */
export async function deleteItem(itemId: string, ownerId: string) {
  // Check if document exists
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

  const itemData = doc.data();

  if (itemData?.ownerId !== ownerId) {
    return null;
  }

  // Delete the document
  await itemsCollection.doc(itemId).delete();

  return {
    message: "Item deleted successfully",
    id: itemId,
  };
}
