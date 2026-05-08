import { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "../config/firebase";

interface RegisterUserData {
  email?: string;
  password?: string;
  displayName?: string;
}

/**
 * AUTH - Register a new Firebase Auth user
 */
export async function registerUser(userData: RegisterUserData) {
  const { email, password, displayName } = userData;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const userRecord = await auth.createUser({
    email,
    password,
    displayName,
  });

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName || null,
    emailVerified: userRecord.emailVerified,
    disabled: userRecord.disabled,
  };
}

/**
 * AUTH - Verify a Firebase ID token from the Authorization header
 */
export async function verifyIdToken(
  authorizationHeader: string | undefined
): Promise<DecodedIdToken> {
  if (!authorizationHeader) {
    throw new Error("Authorization header is required");
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("Authorization header must use Bearer token");
  }

  return await auth.verifyIdToken(token);
}

/**
 * AUTH - Get the current authenticated user from an ID token
 */
export async function getCurrentUser(authorizationHeader: string | undefined) {
  const decodedToken = await verifyIdToken(authorizationHeader);
  const userRecord = await auth.getUser(decodedToken.uid);

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName || null,
    emailVerified: userRecord.emailVerified,
    disabled: userRecord.disabled,
  };
}

/**
 * AUTH - Revoke refresh tokens for the current authenticated user
 */
export async function logoutUser(authorizationHeader: string | undefined) {
  const decodedToken = await verifyIdToken(authorizationHeader);

  await auth.revokeRefreshTokens(decodedToken.uid);

  return {
    message: "User logged out successfully",
    uid: decodedToken.uid,
  };
}
