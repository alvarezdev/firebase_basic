import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import type {AppServices} from "../../dependencies";
import {
  createItemSchema,
  itemIdQuerySchema,
  paginationQuerySchema,
  updateItemSchema,
} from "../../modules/items/item.schemas";
import {logInfo, notFoundError} from "../../shared";
import {validateRequest} from "../../validation";
import type {HttpAuthGuards} from "../auth";
import {sendErrorResponse} from "../responses";

type ItemHandlerDependencies = Pick<AppServices, "itemService"> &
  Pick<HttpAuthGuards, "requireActiveAuth">;

/**
 * Create Firestore item HTTP handlers from injected dependencies.
 *
 * @param {ItemHandlerDependencies} dependencies Handler dependencies.
 * @return {object} Firestore item HTTP handlers.
 */
export function createItemHandlers(dependencies: ItemHandlerDependencies) {
  const {
    itemService,
    requireActiveAuth,
  } = dependencies;

  /**
   * CREATE - Add a new item to Firestore
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function createItemHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireActiveAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const body = validateRequest(createItemSchema, req.body);
      const result = await itemService.createItem(body, authUser.uid);
      logInfo("Item created", {
        transport: "http",
        operation: "createItem",
        uid: authUser.uid,
        itemId: result.id,
      });
      res.status(201).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to create item", 500, {
        operation: "createItem",
        uid: authUser.uid,
      });
    }
  }

  /**
   * READ - Get all items with pagination support
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function getAllItemsHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireActiveAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const {limit, cursor} = validateRequest(paginationQuerySchema, req.query);
      const result = await itemService.getAllItems(
        limit,
        cursor,
        authUser.uid,
        authUser.role
      );
      logInfo("Items listed", {
        transport: "http",
        operation: "getAllItems",
        uid: authUser.uid,
        role: authUser.role,
        count: result.pagination.count,
        total: result.pagination.total,
        limit,
        cursor: cursor || null,
        nextCursor: result.pagination.nextCursor,
        hasMore: result.pagination.hasMore,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to fetch items", 500, {
        operation: "getAllItems",
        uid: authUser.uid,
      });
    }
  }

  /**
   * READ - Get a single item by ID
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function getItemByIdHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireActiveAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);
      const result = await itemService.getItemById(
        itemId,
        authUser.uid,
        authUser.role
      );

      if (!result) {
        sendErrorResponse(
          res,
          notFoundError("Item not found"),
          "Item not found",
          404,
          {operation: "getItemById", uid: authUser.uid, itemId}
        );
        return;
      }

      logInfo("Item fetched", {
        transport: "http",
        operation: "getItemById",
        uid: authUser.uid,
        itemId,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to fetch item", 500, {
        operation: "getItemById",
        uid: authUser.uid,
      });
    }
  }

  /**
   * UPDATE - Update an existing item
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function updateItemHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireActiveAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);
      const updateData = validateRequest(updateItemSchema, req.body);
      const result = await itemService.updateItem(
        itemId,
        updateData,
        authUser.uid,
        authUser.role
      );

      if (!result) {
        sendErrorResponse(
          res,
          notFoundError("Item not found"),
          "Item not found",
          404,
          {operation: "updateItem", uid: authUser.uid, itemId}
        );
        return;
      }

      logInfo("Item updated", {
        transport: "http",
        operation: "updateItem",
        uid: authUser.uid,
        itemId,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to update item", 500, {
        operation: "updateItem",
        uid: authUser.uid,
      });
    }
  }

  /**
   * DELETE - Delete an item
   *
   * @param {Request} req HTTP request.
   * @param {Response} res HTTP response.
   */
  async function deleteItemHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    const authUser = await requireActiveAuth(req, res);

    if (!authUser) {
      return;
    }

    try {
      const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);
      const result = await itemService.deleteItem(
        itemId,
        authUser.uid,
        authUser.role
      );

      if (!result) {
        sendErrorResponse(
          res,
          notFoundError("Item not found"),
          "Item not found",
          404,
          {operation: "deleteItem", uid: authUser.uid, itemId}
        );
        return;
      }

      logInfo("Item deleted", {
        transport: "http",
        operation: "deleteItem",
        uid: authUser.uid,
        itemId,
      });
      res.status(200).json(result);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to delete item", 500, {
        operation: "deleteItem",
        uid: authUser.uid,
      });
    }
  }

  return {
    createItemHandler,
    getAllItemsHandler,
    getItemByIdHandler,
    updateItemHandler,
    deleteItemHandler,
  };
}
