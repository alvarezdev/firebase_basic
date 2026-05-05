import { db } from "../config/firebase";

const itemsCollection = db.collection("items");

/**
 * CREATE - Add a new item to Firestore
 */
export async function createItem(itemData: any) {
  const docRef = await itemsCollection.add(itemData);
  return {
    id: docRef.id,
    ...itemData,
  };
}

/**
 * READ - Get all items with pagination support
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
 */
export async function updateItem(itemId: string, updateData: any) {
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
