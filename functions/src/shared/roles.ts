export type AppRole = "pending" | "user" | "admin";
export type ActiveRole = "user" | "admin";

/**
 * Check whether a role has admin privileges.
 *
 * @param {unknown} role Role claim from the Firebase ID token.
 * @return {boolean} True when role is admin.
 */
export function isAdminRole(role: unknown): role is "admin" {
  return role === "admin";
}

/**
 * Check whether a role can use protected business resources.
 *
 * @param {unknown} role Role claim from the Firebase ID token.
 * @return {boolean} True when role is user or admin.
 */
export function isActiveRole(role: unknown): role is ActiveRole {
  return role === "user" || role === "admin";
}
