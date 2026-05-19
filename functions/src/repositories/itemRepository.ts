import {FieldPath} from "firebase-admin/firestore";
import {db} from "../config/firebase";
import type {CreateItemInput, UpdateItemInput} from "../validation";

export type ItemData = CreateItemInput & {
  ownerId: string;
};

export type ItemRecord = ItemData & {
  id: string;
};

export type ItemPage = {
  items: ItemRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

const itemsCollection = db.collection("items");

/**
 * Create a new item document.
 *
 * @param {ItemData} itemData Item data to persist.
 * @return {Promise<ItemRecord>} Created item with generated ID.
 */
export async function createItem(itemData: ItemData): Promise<ItemRecord> {
  const docRef = await itemsCollection.add(itemData);

  return {
    id: docRef.id,
    ...itemData,
  };
}

/**
 * Count items for a query scope.
 *
 * @param {string | undefined} ownerId Optional owner filter.
 * @return {Promise<number>} Total item count.
 */
export async function countItems(ownerId?: string): Promise<number> {
  const itemsQuery = ownerId ?
    itemsCollection.where("ownerId", "==", ownerId) :
    itemsCollection;
  const totalSnapshot = await itemsQuery.count().get();

  return totalSnapshot.data().count;
}

/**
 * List items with pagination.
 *
 * @param {number} limit Maximum number of items to return.
 * @param {string | undefined} cursor Last item ID from previous page.
 * @param {string | undefined} ownerId Optional owner filter.
 * @return {Promise<ItemPage>} Paginated items and cursor metadata.
 */
export async function listItems(
  limit: number,
  cursor?: string,
  ownerId?: string
): Promise<ItemPage> {
  let itemsQuery: FirebaseFirestore.Query = ownerId ?
    itemsCollection.where("ownerId", "==", ownerId) :
    itemsCollection;

  itemsQuery = itemsQuery.orderBy(FieldPath.documentId());

  if (cursor) {
    itemsQuery = itemsQuery.startAfter(cursor);
  }

  const snapshot = await itemsQuery.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const pageDocs = snapshot.docs.slice(0, limit);
  const items = pageDocs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ItemRecord[];

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id || null : null,
    hasMore,
  };
}

/**
 * Find one item by document ID.
 *
 * @param {string} itemId Firestore document ID.
 * @return {Promise<ItemRecord | null>} Item record or null.
 */
export async function findItemById(
  itemId: string
): Promise<ItemRecord | null> {
  const doc = await itemsCollection.doc(itemId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as ItemRecord;
}

/**
 * Update one item document.
 *
 * @param {string} itemId Firestore document ID.
 * @param {UpdateItemInput} updateData Partial item data.
 */
export async function updateItem(
  itemId: string,
  updateData: UpdateItemInput
): Promise<void> {
  await itemsCollection.doc(itemId).update(updateData);
}

/**
 * Delete one item document.
 *
 * @param {string} itemId Firestore document ID.
 */
export async function deleteItem(itemId: string): Promise<void> {
  await itemsCollection.doc(itemId).delete();
}
