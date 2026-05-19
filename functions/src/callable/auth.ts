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
 * Require a valid Firebase Auth context for callable functions.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {CallableAuthUser} Authenticated callable user.
 */
export function requireCallableAuth(
  request: CallableRequest<unknown>
): CallableAuthUser {
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
 * @return {CallableAuthUser} Authenticated active user.
 */
export function requireCallableActiveAuth(
  request: CallableRequest<unknown>
): CallableAuthUser {
  const authUser = requireCallableAuth(request);

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
