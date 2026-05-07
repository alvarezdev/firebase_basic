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
