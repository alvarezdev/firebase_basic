import type {DecodedIdToken} from "firebase-admin/auth";
import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {authService} from "../services";

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
  } catch (error) {
    res.status(401).json({error: "Authentication required"});
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

  if (!authService.isActiveRole(authUser.role)) {
    res.status(403).json({error: "Active user role required"});
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

  if (!authService.isAdminRole(authUser.role)) {
    res.status(403).json({error: "Admin role required"});
    return null;
  }

  return authUser;
}
