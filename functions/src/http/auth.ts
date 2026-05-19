import type {DecodedIdToken} from "firebase-admin/auth";
import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {authService} from "../services";
import {
  authenticationError,
  authorizationError,
  isActiveRole,
  isAdminRole,
} from "../shared";
import {sendErrorResponse} from "./responses";

/**
 * Require a valid Firebase Auth ID token for HTTP endpoints.
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 * @return {Promise<DecodedIdToken | null>} Authenticated user claims.
 */
export async function requireAuth(
  req: Request,
  res: Response
): Promise<DecodedIdToken | null> {
  try {
    return await authService.verifyIdToken(req.get("authorization"));
  } catch {
    sendErrorResponse(
      res,
      authenticationError(),
      "Authentication required",
      401,
      {operation: "requireAuth"}
    );
    return null;
  }
}

/**
 * Require an authenticated user with an active application role.
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 * @return {Promise<DecodedIdToken | null>} Authenticated user claims.
 */
export async function requireActiveAuth(
  req: Request,
  res: Response
): Promise<DecodedIdToken | null> {
  const authUser = await requireAuth(req, res);

  if (!authUser) {
    return null;
  }

  if (!isActiveRole(authUser.role)) {
    sendErrorResponse(
      res,
      authorizationError("Active user role required"),
      "Active user role required",
      403,
      {operation: "requireActiveAuth", uid: authUser.uid}
    );
    return null;
  }

  return authUser;
}

/**
 * Require an authenticated user with admin permissions.
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 * @return {Promise<DecodedIdToken | null>} Authenticated admin claims.
 */
export async function requireAdminAuth(
  req: Request,
  res: Response
): Promise<DecodedIdToken | null> {
  const authUser = await requireAuth(req, res);

  if (!authUser) {
    return null;
  }

  if (!isAdminRole(authUser.role)) {
    sendErrorResponse(
      res,
      authorizationError("Admin role required"),
      "Admin role required",
      403,
      {operation: "requireAdminAuth", uid: authUser.uid}
    );
    return null;
  }

  return authUser;
}
