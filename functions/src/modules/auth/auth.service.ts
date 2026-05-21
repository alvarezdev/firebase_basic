import {createHash, randomBytes} from "crypto";
import type {DecodedIdToken, UserRecord} from "firebase-admin/auth";
import {Timestamp} from "firebase-admin/firestore";
import {
  authenticationError,
  authorizationError,
  badRequestError,
  isActiveRole,
} from "../../shared";
import type {AppRole as UserRole} from "../../shared";
import * as defaultActivationCodeRepository
  from "./activationCode.repository";
import * as defaultAuthRepository from "./auth.repository";
import * as defaultUserProfileRepository from "./userProfile.repository";
import type {
  ActivationCodeRecord,
} from "./activationCode.repository";
import type {
  CreateAuthUserData,
} from "./auth.repository";
import type {
  CreateActivationCodeInput,
  RegisterUserInput,
  SetUserRoleInput,
} from "./auth.schemas";
import type {
  PendingUserProfile,
  UserProfileData,
  UserStatus,
} from "./userProfile.repository";

const emulatorPaymentSecret = "demo-payment-secret";

export type RegisterUserResponse = {
  uid: string;
  email?: string;
  displayName: string | null;
  emailVerified: boolean;
  disabled: boolean;
  role: UserRole;
  status: UserStatus;
};

export type CurrentUserResponse = {
  uid: string;
  email?: string;
  displayName: string | null;
  emailVerified: boolean;
  disabled: boolean;
  role: unknown;
};

export type SetUserRoleResponse = {
  message: string;
  uid: string;
  role: "user" | "admin";
};

export type UserRoleResponse = {
  uid: string;
  email?: string;
  role: unknown;
};

export type ActivationCodeResponse = {
  code?: string;
  email: string | null;
  role: "admin";
  used: false;
  expiresAt: string;
};

export type PendingUsersResponse = {
  count: number;
  users: PendingUserProfile[];
};

export type LogoutUserResponse = {
  message: string;
  uid: string;
};

export type AuthRepository = {
  createUser(userData: CreateAuthUserData): Promise<UserRecord>;
  deleteUser(uid: string): Promise<void>;
  findUserById(uid: string): Promise<UserRecord>;
  setRoleClaim(uid: string, role: string): Promise<void>;
  verifyToken(token: string): Promise<DecodedIdToken>;
  revokeUserRefreshTokens(uid: string): Promise<void>;
};

export type ActivationCodeRepository = {
  findActivationCodeByHash(
    codeHash: string
  ): Promise<ActivationCodeRecord | null>;
  consumeActivationCode(
    codeHash: string,
    uid: string,
    email: string
  ): Promise<UserRole>;
  createActivationCode(data: ActivationCodeRecord): Promise<void>;
};

export type UserProfileRepository = {
  saveUserProfile(data: UserProfileData): Promise<void>;
  activateUserProfile(data: UserProfileData): Promise<void>;
  listPendingUsers(): Promise<PendingUserProfile[]>;
};

export type AuthServiceDependencies = {
  activationCodeRepository: ActivationCodeRepository;
  authRepository: AuthRepository;
  userProfileRepository: UserProfileRepository;
};

export type AuthService = {
  registerUser(userData: RegisterUserInput): Promise<RegisterUserResponse>;
  verifyIdToken(
    authorizationHeader: string | undefined
  ): Promise<DecodedIdToken>;
  getCurrentUser(
    authorizationHeader: string | undefined
  ): Promise<CurrentUserResponse>;
  setUserRole(
    roleData: SetUserRoleInput,
    approvedBy?: string
  ): Promise<SetUserRoleResponse>;
  getUserRole(uid: string): Promise<UserRoleResponse>;
  createActivationCode(
    data: CreateActivationCodeInput,
    paymentSecret: string | undefined,
    configuredPaymentSecret?: string
  ): Promise<ActivationCodeResponse>;
  listPendingUsers(): Promise<PendingUsersResponse>;
  logoutUser(
    authorizationHeader: string | undefined
  ): Promise<LogoutUserResponse>;
};

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
 * Hash an activation code before using it as Firestore data.
 *
 * @param {string} code Normalized activation code.
 * @return {string} SHA-256 activation code hash.
 */
function hashActivationCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate a human-readable subscription activation code.
 *
 * @return {string} Activation code.
 */
function generateActivationCode() {
  return `SUB-${randomBytes(16).toString("hex").toUpperCase()}`;
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
 * @param {string | undefined} configuredPaymentSecret Runtime secret.
 */
function validatePaymentSecret(
  paymentSecret: string | undefined,
  configuredPaymentSecret?: string
) {
  const configuredSecret =
    configuredPaymentSecret || process.env.PAYMENT_WEBHOOK_SECRET;
  const expectedSecret = configuredSecret ||
    (isEmulatorRuntime() ? emulatorPaymentSecret : undefined);

  if (!expectedSecret || paymentSecret !== expectedSecret) {
    throw authorizationError("Invalid payment webhook secret");
  }
}

/**
 * Decide if the raw code can be returned for local manual testing.
 *
 * @return {boolean} True when local testing can expose the code.
 */
function shouldExposeActivationCode() {
  return isEmulatorRuntime() ||
    process.env.EXPOSE_ACTIVATION_CODES === "true";
}

/**
 * Create Auth service operations from injected dependencies.
 *
 * @param {AuthServiceDependencies} dependencies Auth service dependencies.
 * @return {AuthService} Auth service operations.
 */
export function createAuthService(
  dependencies: AuthServiceDependencies
): AuthService {
  const {
    activationCodeRepository,
    authRepository,
    userProfileRepository,
  } = dependencies;

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
    const normalizedCode = normalizeActivationCode(activationCode);
    const codeHash = hashActivationCode(normalizedCode);
    const codeData = await activationCodeRepository
      .findActivationCodeByHash(codeHash);

    if (!codeData) {
      throw badRequestError("Activation code not found");
    }

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

    return await activationCodeRepository.consumeActivationCode(
      hashActivationCode(normalizedCode),
      uid,
      email
    );
  }

  /**
   * AUTH - Register a new Firebase Auth user
   *
   * @param {RegisterUserInput} userData User registration data.
   * @return {Promise<RegisterUserResponse>} Created user metadata.
   */
  async function registerUser(
    userData: RegisterUserInput
  ): Promise<RegisterUserResponse> {
    const {email, password, displayName, activationCode} = userData;

    if (!email || !password) {
      throw badRequestError("Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    let userRecord: UserRecord | undefined;

    if (activationCode) {
      await assertActivationCodeCanBeUsed(activationCode, normalizedEmail);
    }

    try {
      userRecord = await authRepository.createUser({
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

      await authRepository.setRoleClaim(userRecord.uid, role);

      await userProfileRepository.saveUserProfile({
        uid: userRecord.uid,
        email: normalizedEmail,
        displayName,
        role,
        status,
        activationCodeHash: activationCode ?
          hashActivationCode(normalizeActivationCode(activationCode)) :
          undefined,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        role,
        status,
      };
    } catch (error) {
      if (userRecord) {
        await authRepository.deleteUser(userRecord.uid);
      }
      throw error;
    }
  }

  /**
   * AUTH - Verify a Firebase ID token from the Authorization header
   *
   * @param {string | undefined} authorizationHeader Authorization header value.
   * @return {Promise<DecodedIdToken>} Decoded Firebase ID token.
   */
  async function verifyIdToken(
    authorizationHeader: string | undefined
  ): Promise<DecodedIdToken> {
    if (!authorizationHeader) {
      throw authenticationError("Authorization header is required");
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw authenticationError("Authorization header must use Bearer token");
    }

    return await authRepository.verifyToken(token);
  }

  /**
   * AUTH - Get the current authenticated user from an ID token
   *
   * @param {string | undefined} authorizationHeader Authorization header value.
   * @return {Promise<CurrentUserResponse>} Authenticated user metadata.
   */
  async function getCurrentUser(
    authorizationHeader: string | undefined
  ): Promise<CurrentUserResponse> {
    const decodedToken = await verifyIdToken(authorizationHeader);
    const userRecord = await authRepository.findUserById(decodedToken.uid);

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
   * @return {Promise<SetUserRoleResponse>} Updated user role metadata.
   */
  async function setUserRole(
    roleData: SetUserRoleInput,
    approvedBy?: string
  ): Promise<SetUserRoleResponse> {
    const {uid, role} = roleData;

    if (!uid || !role) {
      throw badRequestError("UID and role are required");
    }

    if (!isActiveRole(role)) {
      throw badRequestError("Role must be user or admin");
    }

    await authRepository.setRoleClaim(uid, role);
    const userRecord = await authRepository.findUserById(uid);

    await userProfileRepository.activateUserProfile({
      uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      role,
      status: "active",
      approvedBy: approvedBy || null,
    });

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
   * @return {Promise<UserRoleResponse>} User role metadata.
   */
  async function getUserRole(uid: string): Promise<UserRoleResponse> {
    if (!uid) {
      throw badRequestError("UID is required");
    }

    const userRecord = await authRepository.findUserById(uid);

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
 * @param {string | undefined} configuredPaymentSecret Runtime secret.
 * @return {Promise<ActivationCodeResponse>} Created activation code metadata.
 */
  async function createActivationCode(
    data: CreateActivationCodeInput,
    paymentSecret: string | undefined,
    configuredPaymentSecret?: string
  ): Promise<ActivationCodeResponse> {
    validatePaymentSecret(paymentSecret, configuredPaymentSecret);

    const email = data.email?.trim().toLowerCase() || null;
    const expiresInHours = data.expiresInHours || 24;
    const expiresAt = Timestamp.fromMillis(
      Date.now() + expiresInHours * 60 * 60 * 1000
    );
    const code = generateActivationCode();
    const codeHash = hashActivationCode(code);

    await activationCodeRepository.createActivationCode({
      codeHash,
      email,
      role: "admin",
      used: false,
      expiresAt,
    });

    const response: ActivationCodeResponse = {
      email,
      role: "admin",
      used: false,
      expiresAt: expiresAt.toDate().toISOString(),
    };

    if (shouldExposeActivationCode()) {
      response.code = code;
    }

    return response;
  }

  /**
   * AUTH - List users waiting for admin approval
   *
   * @return {Promise<PendingUsersResponse>} Pending user profiles.
   */
  async function listPendingUsers(): Promise<PendingUsersResponse> {
    const users = await userProfileRepository.listPendingUsers();

    return {
      count: users.length,
      users,
    };
  }

  /**
   * AUTH - Revoke refresh tokens for the current authenticated user
   *
   * @param {string | undefined} authorizationHeader Authorization header value.
   * @return {Promise<LogoutUserResponse>} Logout confirmation.
   */
  async function logoutUser(
    authorizationHeader: string | undefined
  ): Promise<LogoutUserResponse> {
    const decodedToken = await verifyIdToken(authorizationHeader);

    await authRepository.revokeUserRefreshTokens(decodedToken.uid);

    return {
      message: "User logged out successfully",
      uid: decodedToken.uid,
    };
  }

  return {
    registerUser,
    verifyIdToken,
    getCurrentUser,
    setUserRole,
    getUserRole,
    createActivationCode,
    listPendingUsers,
    logoutUser,
  };
}

/** Default Auth service instance. */
export const authService = createAuthService({
  activationCodeRepository: defaultActivationCodeRepository,
  authRepository: defaultAuthRepository,
  userProfileRepository: defaultUserProfileRepository,
});

/** Register a user using the default Auth service. */
export const registerUser = authService.registerUser;

/** Verify an ID token using the default Auth service. */
export const verifyIdToken = authService.verifyIdToken;

/** Get current user using the default Auth service. */
export const getCurrentUser = authService.getCurrentUser;

/** Set user role using the default Auth service. */
export const setUserRole = authService.setUserRole;

/** Get user role using the default Auth service. */
export const getUserRole = authService.getUserRole;

/** Create an activation code using the default Auth service. */
export const createActivationCode = authService.createActivationCode;

/** List pending users using the default Auth service. */
export const listPendingUsers = authService.listPendingUsers;

/** Log out a user using the default Auth service. */
export const logoutUser = authService.logoutUser;
