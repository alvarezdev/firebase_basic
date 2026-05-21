import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import type {AppServices} from "../../dependencies";
import {
  createActivationCodeSchema,
  registerUserSchema,
  setUserRoleSchema,
  uidQuerySchema,
} from "../../modules/auth/auth.schemas";
import {authorizationError, isAdminRole, logInfo} from "../../shared";
import {validateRequest} from "../../validation";
import type {HttpAuthGuards} from "../auth";
import {sendErrorResponse} from "../responses";

type AuthHandlerDependencies = Pick<AppServices, "authService"> &
  Pick<HttpAuthGuards, "requireAdminAuth" | "requireAuth"> & {
    getPaymentWebhookSecret?: () => string | undefined;
  };

/**
 * Create Auth HTTP handlers from injected dependencies.
 *
 * @param {AuthHandlerDependencies} dependencies Handler dependencies.
 * @return {object} Auth HTTP handlers.
 */
export function createAuthHandlers(dependencies: AuthHandlerDependencies) {
  const {
    authService,
    getPaymentWebhookSecret = () => undefined,
    requireAdminAuth,
    requireAuth,
  } = dependencies;

  /**
   * REGISTER - Create a new Firebase Auth user
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function registerUserHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const body = validateRequest(registerUserSchema, req.body);
      const result = await authService.registerUser(body);
      logInfo("User registered", {
        transport: "http",
        operation: "registerUser",
        uid: result.uid,
        role: result.role,
        status: result.status,
      });
      res.status(201).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to register user", 500, {
        operation: "registerUser",
      });
    }
  }

  /**
   * ACTIVATION CODE - Simulate payment provider generating an admin code
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function createActivationCodeHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const body = validateRequest(createActivationCodeSchema, req.body);
      const result = await authService.createActivationCode(
        body,
        req.get("x-payment-secret"),
        getPaymentWebhookSecret()
      );
      logInfo("Activation code created", {
        transport: "http",
        operation: "createActivationCode",
        role: result.role,
        hasEmailRestriction: Boolean(result.email),
        expiresAt: result.expiresAt,
      });
      res.status(201).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to create activation code", 500, {
        operation: "createActivationCode",
      });
    }
  }

  /**
   * CURRENT USER - Get authenticated user profile from ID token
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function getCurrentUserHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const result = await authService.getCurrentUser(req.get("authorization"));
      logInfo("Current user fetched", {
        transport: "http",
        operation: "getCurrentUser",
        uid: result.uid,
        role: result.role,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Authentication required", 401, {
        operation: "getCurrentUser",
      });
    }
  }

  /**
   * LOGOUT - Revoke refresh tokens for authenticated user
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function logoutUserHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const result = await authService.logoutUser(req.get("authorization"));
      logInfo("User logged out", {
        transport: "http",
        operation: "logoutUser",
        uid: result.uid,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Authentication required", 401, {
        operation: "logoutUser",
      });
    }
  }

  /**
   * SET ROLE - Assign a basic role custom claim to a user
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function setUserRoleHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireAdminAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const body = validateRequest(setUserRoleSchema, req.body);
      const result = await authService.setUserRole(body, authUser.uid);
      logInfo("User role updated", {
        transport: "http",
        operation: "setUserRole",
        adminUid: authUser.uid,
        targetUid: result.uid,
        role: result.role,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to set user role", 500, {
        operation: "setUserRole",
        uid: authUser.uid,
      });
    }
  }

  /**
   * GET ROLE - Get a user's assigned role
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function getUserRoleHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const {uid} = validateRequest(uidQuerySchema, req.query);

      if (authUser.uid !== uid && !isAdminRole(authUser.role)) {
        sendErrorResponse(
          res,
          authorizationError("Admin role required"),
          "Admin role required",
          403,
          {operation: "getUserRole", uid: authUser.uid}
        );
        return;
      }

      const result = await authService.getUserRole(uid);
      logInfo("User role fetched", {
        transport: "http",
        operation: "getUserRole",
        uid: authUser.uid,
        targetUid: result.uid,
        role: result.role,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to get user role", 500, {
        operation: "getUserRole",
        uid: authUser.uid,
      });
    }
  }

  /**
   * PENDING USERS - List users waiting for admin approval
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function listPendingUsersHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireAdminAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const result = await authService.listPendingUsers();
      logInfo("Pending users listed", {
        transport: "http",
        operation: "listPendingUsers",
        uid: authUser.uid,
        count: result.count,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to list pending users", 500, {
        operation: "listPendingUsers",
        uid: authUser.uid,
      });
    }
  }

  return {
    registerUserHandler,
    createActivationCodeHandler,
    getCurrentUserHandler,
    logoutUserHandler,
    setUserRoleHandler,
    getUserRoleHandler,
    listPendingUsersHandler,
  };
}
