import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {db} from "../config/firebase";
import {badRequestError} from "../shared";
import type {AppRole} from "../shared";

export type ActivationCodeRecord = {
  code: string;
  email: string | null;
  role: AppRole;
  used: boolean;
  expiresAt?: Timestamp;
};

const activationCodesCollection = db.collection("activationCodes");

/**
 * Find an activation code by its normalized code value.
 *
 * @param {string} code Normalized activation code.
 * @return {Promise<ActivationCodeRecord | null>} Activation code data.
 */
export async function findActivationCodeByCode(code: string) {
  const snapshot = await activationCodesCollection.doc(code).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as ActivationCodeRecord;
}

/**
 * Consume an activation code atomically.
 *
 * @param {string} code Normalized activation code.
 * @param {string} uid Firebase Auth user ID.
 * @param {string} email Email used during registration.
 * @return {Promise<UserRole>} Role associated with the code.
 */
export async function consumeActivationCode(
  code: string,
  uid: string,
  email: string
): Promise<AppRole> {
  const codeRef = activationCodesCollection.doc(code);

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(codeRef);

    if (!snapshot.exists) {
      throw badRequestError("Activation code not found");
    }

    const codeData = snapshot.data() as ActivationCodeRecord;

    if (codeData.used) {
      throw badRequestError("Activation code already used");
    }

    if (codeData.email && codeData.email !== email) {
      throw badRequestError("Activation code belongs to another email");
    }

    const expiresAt = codeData.expiresAt;

    if (expiresAt && expiresAt.toMillis() <= Date.now()) {
      throw badRequestError("Activation code expired");
    }

    transaction.update(codeRef, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: uid,
      usedByEmail: email,
    });

    return codeData.role === "admin" ? "admin" : "user";
  });
}

/**
 * Create a new activation code document.
 *
 * @param {ActivationCodeRecord} data Activation code data.
 */
export async function createActivationCode(data: ActivationCodeRecord) {
  await activationCodesCollection.doc(data.code).set({
    code: data.code,
    email: data.email,
    role: data.role,
    used: data.used,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: data.expiresAt,
  });
}
