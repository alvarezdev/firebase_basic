import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {methodNotAllowedError} from "../shared";
import {sendErrorResponse} from "./responses";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
type HttpHandler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Enforce allowed HTTP methods before executing endpoint logic.
 *
 * @param {string} operation Operation name.
 * @param {HttpMethod[]} allowedMethods Allowed HTTP methods.
 * @param {HttpHandler} handler HTTP handler.
 * @return {HttpHandler} Method-guarded HTTP handler.
 */
export function withHttpMethods(
  operation: string,
  allowedMethods: HttpMethod[],
  handler: HttpHandler
): HttpHandler {
  return async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (!allowedMethods.includes(req.method as HttpMethod)) {
      const allowHeader = allowedMethods.join(", ");
      res.setHeader("Allow", allowHeader);
      sendErrorResponse(
        res,
        methodNotAllowedError(`Method ${req.method} not allowed`),
        "Method not allowed",
        405,
        {
          operation,
          method: req.method,
          allowedMethods: allowHeader,
        }
      );
      return;
    }

    await handler(req, res);
  };
}
