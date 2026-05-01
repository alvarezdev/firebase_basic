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