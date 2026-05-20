import {FieldValue} from "firebase-admin/firestore";
import {db} from "../../config/firebase";
import type {AppRole} from "../../shared";

export type UserStatus = "pending" | "active";

export type UserProfileData = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: AppRole;
  status: UserStatus;
  activationCodeHash?: string | null;
  approvedBy?: string | null;
};

export type PendingUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: AppRole;
  status: UserStatus;
  createdAt: string | null;
};

const userProfilesCollection = db.collection("users");

/**
 * Save an application user profile.
 *
 * @param {UserProfileData} data User profile data.
 */
export async function saveUserProfile(data: UserProfileData): Promise<void> {
  await userProfilesCollection.doc(data.uid).set({
    uid: data.uid,
    email: data.email,
    displayName: data.displayName || null,
    role: data.role,
    status: data.status,
    activationCodeHash: data.activationCodeHash || null,
    approvedBy: data.approvedBy || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

/**
 * Mark a user profile as active with a new role.
 *
 * @param {UserProfileData} data User profile data.
 */
export async function activateUserProfile(
  data: UserProfileData
): Promise<void> {
  await userProfilesCollection.doc(data.uid).set({
    uid: data.uid,
    email: data.email,
    displayName: data.displayName || null,
    role: data.role,
    status: "active",
    approvedBy: data.approvedBy || null,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

/**
 * List users waiting for admin approval.
 *
 * @return {Promise<PendingUserProfile[]>} Pending profiles.
 */
export async function listPendingUsers(): Promise<PendingUserProfile[]> {
  const snapshot = await userProfilesCollection
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      createdAt: data.createdAt?.toDate?.().toISOString?.() || null,
    } as PendingUserProfile;
  });
}
