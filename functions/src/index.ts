import { onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
// import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore database instance for future use
// const db = getFirestore();

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