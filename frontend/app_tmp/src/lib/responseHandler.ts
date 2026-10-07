// Centralized, consistent API response helpers.
//
// Success shape:   { "data": <payload>, "meta"?: <object> }
// Error shape:     { "error": { "code": string, "message": string, "details"?: unknown } }
//
// These helpers are the single source of truth for API response formatting.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isProduction } from "@/lib/env";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_ID"
  | "INVALID_CREDENTIALS"
  | "CONFLICT"
  | "DUPLICATE_APPLICATION"
  | "INTERNAL_ERROR";

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_ID: 400,
  INVALID_CREDENTIALS: 401,
  CONFLICT: 409,
  DUPLICATE_APPLICATION: 409,
  INTERNAL_ERROR: 500,
};

export function successResponse<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  const body: { data: T; meta?: Record<string, unknown> } = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  statusOverride?: number,
) {
  const status = statusOverride ?? STATUS_FOR_CODE[code];
  const error: { code: ApiErrorCode; message: string; details?: unknown } = { code, message };
  if (details !== undefined) error.details = details;
  return NextResponse.json({ error }, { status });
}

/** Builds a 422 response from a ZodError with field-level details. */
export function validationError(error: ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));
  return errorResponse("VALIDATION_ERROR", "Validation failed", details);
}

/**
 * Converts an unknown thrown value into a safe error response.
 * In production, internal (500) errors never leak the raw message, stack,
 * or Prisma internals. Known AppError-style objects ({ status, message })
 * are passed through with their status.
 */
export function handleRouteError(err: unknown) {
  const maybe = err as { status?: number; code?: ApiErrorCode; message?: string };

  // Server-side logging of the full error for diagnostics.
  console.error("[api error]", err);

  const status = typeof maybe?.status === "number" ? maybe.status : 500;

  if (status >= 500) {
    // Never expose internal details to clients.
    return errorResponse("INTERNAL_ERROR", "Something went wrong. Please try again.");
  }

  // 4xx errors can carry a useful, non-sensitive message.
  const code: ApiErrorCode = maybe?.code ?? codeForStatus(status);
  const message = isProduction && status >= 500 ? "Something went wrong." : maybe?.message || "Request failed";
  return errorResponse(code, message, undefined, status);
}

function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return "INVALID_ID";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_ERROR";
    default:
      return "INTERNAL_ERROR";
  }
}
