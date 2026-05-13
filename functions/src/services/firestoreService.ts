import {db} from "../config/firebase";

const itemsCollection = db.collection("items");

/**
 * CREATE - Add a new item to Firestore
 *
 * @param {any} itemData Data to store in the item document.
 * @return {Promise<object>} Created item with generated Firestore ID.
 */
export async function createItem(itemData: Record<string, unknown>) {
  const docRef = await itemsCollection.add(itemData);
  return {
    id: docRef.id,
    ...itemData,
  };
}

/**
 * READ - Get all items with pagination support
 *
 * @param {number} limit Maximum number of items to return.
 * @param {number} offset Number of items to skip.
 * @return {Promise<object>} Items and pagination metadata.
 */
export async function getAllItems(limit: number, offset: number) {
  // Get total count of items
  const totalSnapshot = await itemsCollection.count().get();
  const total = totalSnapshot.data().count;

  // Get paginated items
  const snapshot = await itemsCollection
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
 * @return {Promise<object | null>} Item data, or null if it does not exist.
 */
export async function getItemById(itemId: string) {
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * UPDATE - Update an existing item
 *
 * @param {string} itemId Firestore document ID.
 * @param {any} updateData Partial data to update.
 * @return {Promise<object | null>} Updated item, or null if it does not exist.
 */
export async function updateItem(
  itemId: string,
  updateData: Record<string, unknown>
) {
  // Check if document exists
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

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
 * @return {Promise<object | null>} Delete confirmation, or null if missing.
 */
export async function deleteItem(itemId: string) {
  // Check if document exists
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

  // Delete the document
  await itemsCollection.doc(itemId).delete();

  return {
    message: "Item deleted successfully",
    id: itemId,
  };
}
