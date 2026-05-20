import {z} from "zod";

const itemIdSchema = z.string()
  .trim()
  .min(1)
  .max(128);

export const itemIdQuerySchema = z.object({
  id: itemIdSchema,
}).strict();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: itemIdSchema.optional(),
}).strict();

export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  done: z.boolean(),
}).strict();

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  done: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required",
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
