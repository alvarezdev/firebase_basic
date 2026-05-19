import {
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {authService} from "../services";

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
    throw new HttpsError("unauthenticated", "Authentication required");
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

  if (!authService.isActiveRole(authUser.role)) {
    throw new HttpsError("permission-denied", "Active user role required");
  }

  return authUser;
}
