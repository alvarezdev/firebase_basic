import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore database instance
export const db = getFirestore();

// Get Cloud Storage bucket instance
export const bucket = getStorage().bucket();
