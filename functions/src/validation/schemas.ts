import {z} from "zod";

export {
  createActivationCodeSchema,
  registerUserSchema,
  setUserRoleSchema,
  uidQuerySchema,
} from "../modules/auth/auth.schemas";
export type {
  CreateActivationCodeInput,
  RegisterUserInput,
  SetUserRoleInput,
} from "../modules/auth/auth.schemas";
export {
  createItemSchema,
  itemIdQuerySchema,
  paginationQuerySchema,
  updateItemSchema,
} from "../modules/items/item.schemas";
export type {
  CreateItemInput,
  UpdateItemInput,
} from "../modules/items/item.schemas";

const filenameSchema = z.string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9._/-]+$/)
  .refine((filename) => !filename.startsWith("/"), {
    message: "Filename must not start with slash",
  })
  .refine((filename) => !filename.includes(".."), {
    message: "Filename must not include parent directory segments",
  });

const uploadFilenameSchema = filenameSchema.refine(
  (filename) => !filename.includes("/"),
  {message: "Upload filename must not include folders"}
);

export const uploadFileQuerySchema = z.object({
  filename: uploadFilenameSchema.optional(),
}).strict();

export const filenameQuerySchema = z.object({
  filename: filenameSchema,
}).strict();
