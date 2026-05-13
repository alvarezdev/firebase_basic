import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore database instance
export const db = getFirestore();

// Get Auth instance
export const auth = getAuth();

// Get Cloud Storage bucket instance
export const bucket = getStorage().bucket();
