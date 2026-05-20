import {z} from "zod";

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

const emailSchema = z.string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());

const activationCodeSchema = z.string()
  .trim()
  .toUpperCase()
  .regex(/^SUB-[A-F0-9]{32}$/);

const uidSchema = z.string()
  .trim()
  .min(1)
  .max(128);

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

export const registerUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
  activationCode: activationCodeSchema.optional(),
}).strict();

export const createActivationCodeSchema = z.object({
  email: emailSchema.optional(),
  expiresInHours: z.coerce.number().int().min(1).max(168).optional(),
}).strict();

export const setUserRoleSchema = z.object({
  uid: uidSchema,
  role: z.enum(["user", "admin"]),
}).strict();

export const uidQuerySchema = z.object({
  uid: uidSchema,
}).strict();

export const uploadFileQuerySchema = z.object({
  filename: uploadFilenameSchema.optional(),
}).strict();

export const filenameQuerySchema = z.object({
  filename: filenameSchema,
}).strict();

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type CreateActivationCodeInput =
  z.infer<typeof createActivationCodeSchema>;
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;
