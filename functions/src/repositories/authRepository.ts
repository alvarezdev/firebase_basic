import type {DecodedIdToken, UserRecord} from "firebase-admin/auth";
import {auth} from "../config/firebase";

export type CreateAuthUserData = {
  email: string;
  password: string;
  displayName?: string;
};

/**
 * Create a Firebase Auth user.
 *
 * @param {CreateAuthUserData} userData Firebase Auth user data.
 * @return {Promise<UserRecord>} Created user.
 */
export async function createUser(
  userData: CreateAuthUserData
): Promise<UserRecord> {
  return await auth.createUser(userData);
}

/**
 * Delete a Firebase Auth user.
 *
 * @param {string} uid Firebase Auth user ID.
 */
export async function deleteUser(uid: string): Promise<void> {
  await auth.deleteUser(uid);
}

/**
 * Find a Firebase Auth user by UID.
 *
 * @param {string} uid Firebase Auth user ID.
 * @return {Promise<UserRecord>} Auth user.
 */
export async function findUserById(uid: string): Promise<UserRecord> {
  return await auth.getUser(uid);
}

/**
 * Set the application role custom claim.
 *
 * @param {string} uid Firebase Auth user ID.
 * @param {string} role Application role.
 */
export async function setRoleClaim(uid: string, role: string): Promise<void> {
  await auth.setCustomUserClaims(uid, {role});
}

/**
 * Verify a Firebase ID token.
 *
 * @param {string} token Firebase ID token.
 * @return {Promise<DecodedIdToken>} Decoded token.
 */
export async function verifyToken(token: string): Promise<DecodedIdToken> {
  return await auth.verifyIdToken(token);
}

/**
 * Revoke refresh tokens for a Firebase Auth user.
 *
 * @param {string} uid Firebase Auth user ID.
 */
export async function revokeUserRefreshTokens(uid: string): Promise<void> {
  await auth.revokeRefreshTokens(uid);
}
