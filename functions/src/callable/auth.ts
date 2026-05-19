import {
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {authService} from "../services";
import {
  authenticationError,
  authorizationError,
  isActiveRole,
  logWarning,
} from "../shared";

export type CallableAuthUser = {
  uid: string;
  role: unknown;
};

type CallableDataWithToken = {
  idToken?: unknown;
};

/**
 * Remove the teaching-only idToken field before validating business payloads.
 *
 * @param {unknown} data Callable request data.
 * @return {unknown} Callable data without idToken.
 */
export function getCallablePayload(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const payload = {...data as Record<string, unknown>};
  delete payload.idToken;
  return payload;
}

/**
 * Require a valid Firebase Auth context for callable functions.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<CallableAuthUser>} Authenticated callable user.
 */
export async function requireCallableAuth(
  request: CallableRequest<unknown>
): Promise<CallableAuthUser> {
  if (!request.auth) {
    const error = authenticationError();
    logWarning(error.message, {
      transport: "callable",
      operation: "requireCallableAuth",
      callableCode: error.callableCode,
    });
    throw new HttpsError(error.callableCode, error.message);
  }

  const idToken = (request.data as CallableDataWithToken | undefined)?.idToken;

  if (typeof idToken !== "string" || !idToken) {
    const error = authenticationError("Callable idToken is required");
    logWarning(error.message, {
      transport: "callable",
      operation: "requireCallableAuth",
      callableCode: error.callableCode,
      uid: request.auth.uid,
    });
    throw new HttpsError(error.callableCode, error.message);
  }

  let decodedToken;

  try {
    decodedToken = await authService.verifyIdToken(`Bearer ${idToken}`);
  } catch {
    const error = authenticationError();
    logWarning(error.message, {
      transport: "callable",
      operation: "requireCallableAuth",
      callableCode: error.callableCode,
      uid: request.auth.uid,
    });
    throw new HttpsError(error.callableCode, error.message);
  }

  if (decodedToken.uid !== request.auth.uid) {
    const error = authenticationError("Callable idToken user mismatch");
    logWarning(error.message, {
      transport: "callable",
      operation: "requireCallableAuth",
      callableCode: error.callableCode,
      uid: request.auth.uid,
      tokenUid: decodedToken.uid,
    });
    throw new HttpsError(error.callableCode, error.message);
  }

  return {
    uid: decodedToken.uid,
    role: decodedToken.role,
  };
}

/**
 * Require an active user role for callable functions.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<CallableAuthUser>} Authenticated active user.
 */
export async function requireCallableActiveAuth(
  request: CallableRequest<unknown>
): Promise<CallableAuthUser> {
  const authUser = await requireCallableAuth(request);

  if (!isActiveRole(authUser.role)) {
    const error = authorizationError("Active user role required");
    logWarning(error.message, {
      transport: "callable",
      operation: "requireCallableActiveAuth",
      callableCode: error.callableCode,
      uid: authUser.uid,
    });
    throw new HttpsError(error.callableCode, error.message);
  }

  return authUser;
}
