import {isAdminRole} from "../../shared/roles";
import * as defaultItemRepository from "./item.repository";
import type {CreateItemInput, UpdateItemInput} from "./item.schemas";
import type {ItemData, ItemPage, ItemRecord} from "./item.repository";

export type PaginationMetadata = {
  total: number;
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
};

export type ItemListResponse = {
  data: ItemRecord[];
  pagination: PaginationMetadata;
};

export type DeleteItemResponse = {
  message: string;
  id: string;
};

export type ItemRepository = {
  createItem(itemData: ItemData): Promise<ItemRecord>;
  countItems(ownerId?: string): Promise<number>;
  listItems(
    limit: number,
    cursor?: string,
    ownerId?: string
  ): Promise<ItemPage>;
  findItemById(itemId: string): Promise<ItemRecord | null>;
  updateItem(itemId: string, updateData: UpdateItemInput): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
};

export type ItemServiceDependencies = {
  itemRepository: ItemRepository;
};

export type ItemService = {
  createItem(
    itemData: CreateItemInput,
    ownerId: string
  ): Promise<ItemRecord>;
  getAllItems(
    limit: number,
    cursor: string | undefined,
    ownerId: string,
    role: unknown
  ): Promise<ItemListResponse>;
  getItemById(
    itemId: string,
    ownerId: string,
    role: unknown
  ): Promise<ItemRecord | null>;
  updateItem(
    itemId: string,
    updateData: UpdateItemInput,
    ownerId: string,
    role: unknown
  ): Promise<ItemRecord | null>;
  deleteItem(
    itemId: string,
    ownerId: string,
    role: unknown
  ): Promise<DeleteItemResponse | null>;
};

/**
 * Create item service operations from injected dependencies.
 *
 * @param {ItemServiceDependencies} dependencies Item service dependencies.
 * @return {ItemService} Item service operations.
 */
export function createItemService(
  dependencies: ItemServiceDependencies
): ItemService {
  const {itemRepository} = dependencies;

  /**
   * CREATE - Add a new item to Firestore
   *
   * @param {CreateItemInput} itemData Data to store in the item document.
   * @param {string} ownerId Authenticated user ID.
   * @return {Promise<ItemRecord>} Created item with generated Firestore ID.
   */
  async function createItem(
    itemData: CreateItemInput,
    ownerId: string
  ): Promise<ItemRecord> {
    const data = {
      ...itemData,
      ownerId,
    };

    return await itemRepository.createItem(data);
  }

  /**
   * READ - Get all items with pagination support
   *
   * @param {number} limit Maximum number of items to return.
   * @param {string | undefined} cursor Last item ID from previous page.
   * @param {string} ownerId Authenticated user ID.
   * @param {unknown} role Authenticated user role.
   * @return {Promise<ItemListResponse>} Items and pagination metadata.
   */
  async function getAllItems(
    limit: number,
    cursor: string | undefined,
    ownerId: string,
    role: unknown
  ): Promise<ItemListResponse> {
    const ownerFilter = isAdminRole(role) ? undefined : ownerId;
    const [total, page] = await Promise.all([
      itemRepository.countItems(ownerFilter),
      itemRepository.listItems(limit, cursor, ownerFilter),
    ]);

    return {
      data: page.items,
      pagination: {
        total,
        limit,
        cursor: cursor || null,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        count: page.items.length,
      },
    };
  }

  /**
   * READ - Get a single item by ID
   *
   * @param {string} itemId Firestore document ID.
   * @param {string} ownerId Authenticated user ID.
   * @param {unknown} role Authenticated user role.
   * @return {Promise<ItemRecord | null>} Item data, or null if missing.
   */
  async function getItemById(
    itemId: string,
    ownerId: string,
    role: unknown
  ): Promise<ItemRecord | null> {
    const item = await itemRepository.findItemById(itemId);

    if (!item || (!isAdminRole(role) && item.ownerId !== ownerId)) {
      return null;
    }

    return item;
  }

  /**
   * UPDATE - Update an existing item
   *
   * @param {string} itemId Firestore document ID.
   * @param {UpdateItemInput} updateData Partial data to update.
   * @param {string} ownerId Authenticated user ID.
   * @param {unknown} role Authenticated user role.
   * @return {Promise<ItemRecord | null>} Updated item, or null if missing.
   */
  async function updateItem(
    itemId: string,
    updateData: UpdateItemInput,
    ownerId: string,
    role: unknown
  ): Promise<ItemRecord | null> {
    const item = await itemRepository.findItemById(itemId);

    if (!item || (!isAdminRole(role) && item.ownerId !== ownerId)) {
      return null;
    }

    await itemRepository.updateItem(itemId, updateData);

    return await itemRepository.findItemById(itemId);
  }

  /**
   * DELETE - Delete an item
   *
   * @param {string} itemId Firestore document ID.
   * @param {string} ownerId Authenticated user ID.
   * @param {unknown} role Authenticated user role.
   * @return {Promise<DeleteItemResponse | null>} Delete confirmation, or null.
   */
  async function deleteItem(
    itemId: string,
    ownerId: string,
    role: unknown
  ): Promise<DeleteItemResponse | null> {
    const item = await itemRepository.findItemById(itemId);

    if (!item || (!isAdminRole(role) && item.ownerId !== ownerId)) {
      return null;
    }

    await itemRepository.deleteItem(itemId);

    return {
      message: "Item deleted successfully",
      id: itemId,
    };
  }

  return {
    createItem,
    getAllItems,
    getItemById,
    updateItem,
    deleteItem,
  };
}

/** Default item service instance. */
export const itemService = createItemService({
  itemRepository: defaultItemRepository,
});

/** Create an item using the default item service. */
export const createItem = itemService.createItem;

/** List items using the default item service. */
export const getAllItems = itemService.getAllItems;

/** Find one item using the default item service. */
export const getItemById = itemService.getItemById;

/** Update one item using the default item service. */
export const updateItem = itemService.updateItem;

/** Delete one item using the default item service. */
export const deleteItem = itemService.deleteItem;
