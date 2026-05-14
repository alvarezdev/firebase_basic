import {DecodedIdToken} from "firebase-admin/auth";
import {auth} from "../config/firebase";

interface RegisterUserData {
  email?: string;
  password?: string;
  displayName?: string;
}

type UserRole = "user" | "admin";

interface SetUserRoleData {
  uid?: string;
  role?: UserRole;
}

/**
 * AUTH - Register a new Firebase Auth user
 *
 * @param {RegisterUserData} userData User registration data.
 * @return {Promise<object>} Created user metadata.
 */
export async function registerUser(userData: RegisterUserData) {
  const {email, password, displayName} = userData;

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
 *
 * @param {string | undefined} authorizationHeader Authorization header value.
 * @return {Promise<DecodedIdToken>} Decoded Firebase ID token.
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
 *
 * @param {string | undefined} authorizationHeader Authorization header value.
 * @return {Promise<object>} Authenticated user metadata.
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
    role: decodedToken.role || null,
  };
}

/**
 * AUTH - Set a basic role custom claim for a Firebase Auth user
 *
 * @param {SetUserRoleData} roleData User ID and role to assign.
 * @return {Promise<object>} Updated user role metadata.
 */
export async function setUserRole(roleData: SetUserRoleData) {
  const {uid, role} = roleData;

  if (!uid || !role) {
    throw new Error("UID and role are required");
  }

  if (role !== "user" && role !== "admin") {
    throw new Error("Role must be user or admin");
  }

  await auth.setCustomUserClaims(uid, {role});

  return {
    message: "User role updated successfully",
    uid,
    role,
  };
}

/**
 * AUTH - Get a Firebase Auth user's assigned role
 *
 * @param {string} uid Firebase Auth user ID.
 * @return {Promise<object>} User role metadata.
 */
export async function getUserRole(uid: string) {
  if (!uid) {
    throw new Error("UID is required");
  }

  const userRecord = await auth.getUser(uid);

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    role: userRecord.customClaims?.role || null,
  };
}

/**
 * AUTH - Revoke refresh tokens for the current authenticated user
 *
 * @param {string | undefined} authorizationHeader Authorization header value.
 * @return {Promise<object>} Logout confirmation.
 */
export async function logoutUser(authorizationHeader: string | undefined) {
  const decodedToken = await verifyIdToken(authorizationHeader);

  await auth.revokeRefreshTokens(decodedToken.uid);

  return {
    message: "User logged out successfully",
    uid: decodedToken.uid,
  };
}
