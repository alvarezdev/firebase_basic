import { onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore database instance
const db = getFirestore();

// Get reference to the items collection
const itemsCollection = db.collection("items");

/**
 * Shared business logic
 * Returns a greeting message
 */
async function getHelloMessage() {
  return { message: "Hola 🚀" };
}

/**
 * Callable function - invoke directly from client SDK
 * Returns the hello message as a response object
 */
export const helloCall = onCall(async () => {
  return await getHelloMessage();
});

/**
 * HTTP function - invoke via HTTP request/response
 * Returns the hello message as JSON
 */
export const helloHttp = onRequest(async (req, res) => {
  const result = await getHelloMessage();
  res.json(result);
});

/**
 * CREATE - Add a new item to Firestore
 * Accepts POST request with item data
 * Returns the created item with its ID
 */
export const createItem = onRequest(async (req, res) => {
  try {
    const itemData = req.body;

    // Add item to Firestore and get the document reference
    const docRef = await itemsCollection.add(itemData);

    // Return the created item with its ID
    res.status(201).json({
      id: docRef.id,
      ...itemData,
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to create item" });
  }
});

/**
 * READ - Get all items from Firestore with pagination support
 * Accepts GET request with optional query parameters:
 *   - limit: number of items to fetch (default: 10, max: 100)
 *   - offset: number of items to skip (default: 0)
 * Returns array of items with pagination info
 */
export const getAllItems = onRequest(async (req, res) => {
  try {
    // Parse query parameters with defaults and validation
    let limit = parseInt(req.query.limit as string) || 10;
    let offset = parseInt(req.query.offset as string) || 0;

    // Validate and constrain limit
    if (limit < 1 || limit > 100) {
      limit = 10;
    }
    if (offset < 0) {
      offset = 0;
    }

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

    // Return items with pagination metadata
    res.status(200).json({
      data: items,
      pagination: {
        total,
        limit,
        offset,
        count: items.length,
      },
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch items" });
  }
});

/**
 * READ - Get a single item by ID from Firestore
 * Accepts GET request with itemId parameter
 * Returns the item with specified ID or 404 if not found
 */
export const getItemById = onRequest(async (req, res) => {
  try {
    const itemId = req.query.id as string;

    if (!itemId) {
      res.status(400).json({ error: "Item ID is required" });
      return;
    }

    const doc = await itemsCollection.doc(itemId).get();

    if (!doc.exists) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch item" });
  }
});

/**
 * UPDATE - Update an existing item in Firestore
 * Accepts PUT request with item ID and fields to update
 * Returns the updated item with its ID
 */
export const updateItem = onRequest(async (req, res) => {
  try {
    const itemId = req.query.id as string;
    const updateData = req.body;

    if (!itemId) {
      res.status(400).json({ error: "Item ID is required" });
      return;
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "Update data is required" });
      return;
    }

    // Check if document exists
    const doc = await itemsCollection.doc(itemId).get();

    if (!doc.exists) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Update the document with merge to avoid overwriting entire document
    await itemsCollection.doc(itemId).update(updateData);

    // Fetch the updated document
    const updatedDoc = await itemsCollection.doc(itemId).get();

    // Return the updated item
    res.status(200).json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to update item" });
  }
});

/**
 * DELETE - Delete an item from Firestore
 * Accepts DELETE request with item ID as query parameter
 * Returns confirmation message with deleted item ID
 */
export const deleteItem = onRequest(async (req, res) => {
  try {
    const itemId = req.query.id as string;

    if (!itemId) {
      res.status(400).json({ error: "Item ID is required" });
      return;
    }

    // Check if document exists
    const doc = await itemsCollection.doc(itemId).get();

    if (!doc.exists) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Delete the document
    await itemsCollection.doc(itemId).delete();

    // Return confirmation
    res.status(200).json({
      message: "Item deleted successfully",
      id: itemId,
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete item" });
  }
});