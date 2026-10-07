// Thin adapter helpers bridging the framework-neutral controller/response layer
// to Express. These do not contain business logic; they only translate between
// Express's req/res and the { status, body } results used by responseHandler.
import type { Request, Response } from "express";
import type { ApiResult } from "./responseHandler.js";

/** Sends an ApiResult ({ status, body }) as a JSON HTTP response. */
export function send(res: Response, result: ApiResult): void {
  res.status(result.status).json(result.body);
}

/** Validates a route :id param as an integer, mirroring the old parseId checks. */
export function parseId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

/** Returns the raw Authorization header value from an Express request. */
export function authHeaderOf(req: Request): string | undefined {
  const header = req.headers["authorization"];
  return Array.isArray(header) ? header[0] : header;
}
