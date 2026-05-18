import {randomBytes} from "crypto";
import {DecodedIdToken} from "firebase-admin/auth";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {auth, db} from "../config/firebase";
import type {
  CreateActivationCodeInput,
  RegisterUserInput,
  SetUserRoleInput,
} from "../validation";

type UserRole = "pending" | "user" | "admin";

const userProfilesCollection = db.collection("users");
const activationCodesCollection = db.collection("activationCodes");
const emulatorPaymentSecret = "demo-payment-secret";

/**
 * Check whether a role has admin privileges.
 *
 * @param {unknown} role Role claim from the Firebase ID token.
 * @return {boolean} True when role is admin.
 */
export function isAdminRole(role: unknown) {
  return role === "admin";
}

/**
 * Check whether a role can use protected business resources.
 *
 * @param {unknown} role Role claim from the Firebase ID token.
 * @return {boolean} True when role is user or admin.
 */
export function isActiveRole(role: unknown) {
  return role === "user" || role === "admin";
}

/**
 * Normalize an activation code for storage and lookup.
 *
 * @param {string} code Activation code provided by the client.
 * @return {string} Normalized activation code.
 */
function normalizeActivationCode(code: string) {
  return code.trim().toUpperCase();
}

/**
 * Generate a human-readable subscription activation code.
 *
 * @return {string} Activation code.
 */
function generateActivationCode() {
  return `SUB-${randomBytes(6).toString("hex").toUpperCase()}`;
}

/**
 * Check whether local demo payment secret can be used.
 *
 * @return {boolean} True when running with Firebase emulators.
 */
function isEmulatorRuntime() {
  return process.env.FUNCTIONS_EMULATOR === "true" ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

/**
 * Validate the secret that simulates a payment provider webhook.
 *
 * @param {string | undefined} paymentSecret Payment secret from request header.
 */
function validatePaymentSecret(paymentSecret: string | undefined) {
  const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  const expectedSecret = configuredSecret ||
    (isEmulatorRuntime() ? emulatorPaymentSecret : undefined);

  if (!expectedSecret || paymentSecret !== expectedSecret) {
    throw new Error("Invalid payment webhook secret");
  }
}

/**
 * Validate a code before creating the Firebase Auth user.
 *
 * @param {string} activationCode Activation code provided by the client.
 * @param {string} email Email used during registration.
 */
async function assertActivationCodeCanBeUsed(
  activationCode: string,
  email: string
) {
  const codeRef = activationCodesCollection.doc(
    normalizeActivationCode(activationCode)
  );
  const snapshot = await codeRef.get();

  if (!snapshot.exists) {
    throw new Error("Activation code not found");
  }

  const codeData = snapshot.data();

  if (codeData?.used) {
    throw new Error("Activation code already used");
  }

  if (codeData?.email && codeData.email !== email) {
    throw new Error("Activation code belongs to another email");
  }

  const expiresAt = codeData?.expiresAt as Timestamp | undefined;

  if (expiresAt && expiresAt.toMillis() <= Date.now()) {
    throw new Error("Activation code expired");
  }
}

/**
 * Mark a valid activation code as used and return its target role.
 *
 * @param {string} activationCode Activation code provided by the client.
 * @param {string} uid Firebase Auth user ID created during registration.
 * @param {string} email Email used during registration.
 * @return {Promise<UserRole>} Role associated with the activation code.
 */
async function consumeActivationCode(
  activationCode: string,
  uid: string,
  email: string
): Promise<UserRole> {
  const normalizedCode = normalizeActivationCode(activationCode);
  const codeRef = activationCodesCollection.doc(normalizedCode);

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(codeRef);

    if (!snapshot.exists) {
      throw new Error("Activation code not found");
    }

    const codeData = snapshot.data();

    if (codeData?.used) {
      throw new Error("Activation code already used");
    }

    if (codeData?.email && codeData.email !== email) {
      throw new Error("Activation code belongs to another email");
    }

    const expiresAt = codeData?.expiresAt as Timestamp | undefined;

    if (expiresAt && expiresAt.toMillis() <= Date.now()) {
      throw new Error("Activation code expired");
    }

    transaction.update(codeRef, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: uid,
      usedByEmail: email,
    });

    return codeData?.role === "admin" ? "admin" : "user";
  });
}

/**
 * Store an application profile for admin screens and authorization state.
 *
 * @param {object} data Profile data.
 */
async function saveUserProfile(data: {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: "pending" | "active";
  activationCode?: string;
  approvedBy?: string;
}) {
  await userProfilesCollection.doc(data.uid).set({
    uid: data.uid,
    email: data.email,
    displayName: data.displayName || null,
    role: data.role,
    status: data.status,
    activationCode: data.activationCode || null,
    approvedBy: data.approvedBy || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

/**
 * AUTH - Register a new Firebase Auth user
 *
 * @param {RegisterUserInput} userData User registration data.
 * @return {Promise<object>} Created user metadata.
 */
export async function registerUser(userData: RegisterUserInput) {
  const {email, password, displayName, activationCode} = userData;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  let registeredRole: UserRole = "pending";
  let registeredStatus: "pending" | "active" = "pending";

  if (activationCode) {
    await assertActivationCodeCanBeUsed(activationCode, normalizedEmail);
  }

  let userRecord;

  try {
    userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName,
    });

    const role = activationCode ?
      await consumeActivationCode(
        activationCode,
        userRecord.uid,
        normalizedEmail
      ) :
      "pending";
    const status = role === "pending" ? "pending" : "active";

    await auth.setCustomUserClaims(userRecord.uid, {role});
    registeredRole = role;
    registeredStatus = status;

    await saveUserProfile({
      uid: userRecord.uid,
      email: normalizedEmail,
      displayName,
      role,
      status,
      activationCode: activationCode ?
        normalizeActivationCode(activationCode) :
        undefined,
    });
  } catch (error) {
    if (userRecord) {
      await auth.deleteUser(userRecord.uid);
    }
    throw error;
  }

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName || null,
    emailVerified: userRecord.emailVerified,
    disabled: userRecord.disabled,
    role: registeredRole,
    status: registeredStatus,
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
 * @param {SetUserRoleInput} roleData User ID and role to assign.
 * @param {string | undefined} approvedBy Admin user ID approving the role.
 * @return {Promise<object>} Updated user role metadata.
 */
export async function setUserRole(
  roleData: SetUserRoleInput,
  approvedBy?: string
) {
  const {uid, role} = roleData;

  if (!uid || !role) {
    throw new Error("UID and role are required");
  }

  if (role !== "user" && role !== "admin") {
    throw new Error("Role must be user or admin");
  }

  await auth.setCustomUserClaims(uid, {role});
  const userRecord = await auth.getUser(uid);

  await userProfilesCollection.doc(uid).set({
    uid,
    email: userRecord.email || null,
    displayName: userRecord.displayName || null,
    role,
    status: "active",
    approvedBy: approvedBy || null,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

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
 * AUTH - Create an activation code after a simulated payment event
 *
 * @param {CreateActivationCodeInput} data Activation code metadata.
 * @param {string | undefined} paymentSecret Payment webhook secret header.
 * @return {Promise<object>} Created activation code metadata.
 */
export async function createActivationCode(
  data: CreateActivationCodeInput,
  paymentSecret: string | undefined
) {
  validatePaymentSecret(paymentSecret);

  const email = data.email?.trim().toLowerCase() || null;
  const expiresInHours = data.expiresInHours || 24;
  const expiresAt = Timestamp.fromMillis(
    Date.now() + expiresInHours * 60 * 60 * 1000
  );
  const code = generateActivationCode();

  await activationCodesCollection.doc(code).set({
    code,
    email,
    role: "admin",
    used: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  return {
    code,
    email,
    role: "admin",
    used: false,
    expiresAt: expiresAt.toDate().toISOString(),
  };
}

/**
 * AUTH - List users waiting for admin approval
 *
 * @return {Promise<object>} Pending user profiles.
 */
export async function listPendingUsers() {
  const snapshot = await userProfilesCollection
    .where("status", "==", "pending")
    .get();

  const users = snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      createdAt: data.createdAt?.toDate?.().toISOString?.() || null,
    };
  });

  return {
    count: users.length,
    users,
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
