import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {authService} from "../../services";
import {
  createActivationCodeSchema,
  registerUserSchema,
  setUserRoleSchema,
  uidQuerySchema,
  validateRequest,
} from "../../validation";
import {requireAdminAuth, requireAuth, sendErrorResponse} from "../";

/**
 * REGISTER - Create a new Firebase Auth user
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function registerUserHandler(req: Request, res: Response) {
  try {
    const body = validateRequest(registerUserSchema, req.body);
    const result = await authService.registerUser(body);
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to register user");
  }
}

/**
 * ACTIVATION CODE - Simulate payment provider generating an admin code
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function createActivationCodeHandler(
  req: Request,
  res: Response
) {
  try {
    const body = validateRequest(createActivationCodeSchema, req.body);
    const result = await authService.createActivationCode(
      body,
      req.get("x-payment-secret")
    );
    res.status(201).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to create activation code", 403);
  }
}

/**
 * CURRENT USER - Get authenticated user profile from ID token
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function getCurrentUserHandler(req: Request, res: Response) {
  try {
    const result = await authService.getCurrentUser(req.get("authorization"));
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Authentication required", 401);
  }
}

/**
 * LOGOUT - Revoke refresh tokens for authenticated user
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function logoutUserHandler(req: Request, res: Response) {
  try {
    const result = await authService.logoutUser(req.get("authorization"));
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Authentication required", 401);
  }
}

/**
 * SET ROLE - Assign a basic role custom claim to a user
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function setUserRoleHandler(req: Request, res: Response) {
  const authUser = await requireAdminAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const body = validateRequest(setUserRoleSchema, req.body);
    const result = await authService.setUserRole(body, authUser.uid);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to set user role");
  }
}

/**
 * GET ROLE - Get a user's assigned role
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function getUserRoleHandler(req: Request, res: Response) {
  const authUser = await requireAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {uid} = validateRequest(uidQuerySchema, req.query);

    if (authUser.uid !== uid && !authService.isAdminRole(authUser.role)) {
      res.status(403).json({error: "Admin role required"});
      return;
    }

    const result = await authService.getUserRole(uid);
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to get user role");
  }
}

/**
 * PENDING USERS - List users waiting for admin approval
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function listPendingUsersHandler(req: Request, res: Response) {
  const authUser = await requireAdminAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const result = await authService.listPendingUsers();
    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to list pending users");
  }
}
