import {
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
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

/**
 * Return callable request data for business validation.
 *
 * @param {unknown} data Callable request data.
 * @return {unknown} Callable data.
 */
export function getCallablePayload(data: unknown): unknown {
  return data;
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

  return {
    uid: request.auth.uid,
    role: request.auth.token.role,
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
