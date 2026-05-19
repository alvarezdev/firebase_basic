import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {firestoreService} from "../../services";
import {notFoundError} from "../../shared";
import {
  createItemSchema,
  itemIdQuerySchema,
  paginationQuerySchema,
  updateItemSchema,
  validateRequest,
} from "../../validation";
import {requireActiveAuth, sendErrorResponse} from "../";

/**
 * CREATE - Add a new item to Firestore
 *
 * @param {Request} req HTTP request.
 * @param {Response} res HTTP response.
 */
export async function createItemHandler(
  req: Request,
  res: Response
): Promise<void> {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const body = validateRequest(createItemSchema, req.body);
    const result = await firestoreService.createItem(body, authUser.uid);
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
export async function getAllItemsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {limit, offset} = validateRequest(paginationQuerySchema, req.query);
    const result = await firestoreService.getAllItems(
      limit,
      offset,
      authUser.uid,
      authUser.role
    );
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
export async function getItemByIdHandler(
  req: Request,
  res: Response
): Promise<void> {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);
    const result = await firestoreService.getItemById(
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
export async function updateItemHandler(
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
    const result = await firestoreService.updateItem(
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
export async function deleteItemHandler(
  req: Request,
  res: Response
): Promise<void> {
  const authUser = await requireActiveAuth(req, res);

  if (!authUser) {
    return;
  }

  try {
    const {id: itemId} = validateRequest(itemIdQuerySchema, req.query);
    const result = await firestoreService.deleteItem(
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

    res.status(200).json(result);
  } catch (error) {
    sendErrorResponse(res, error, "Failed to delete item", 500, {
      operation: "deleteItem",
      uid: authUser.uid,
    });
  }
}
