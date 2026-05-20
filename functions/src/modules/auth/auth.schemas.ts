import {z} from "zod";

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

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type CreateActivationCodeInput =
  z.infer<typeof createActivationCodeSchema>;
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;
