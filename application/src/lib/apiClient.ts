"use client";

import { API_BASE_URL } from "@/lib/apiBase";

export type ApiErrorShape = {
  code: string;
  message: string;
  details?: unknown;
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(error: ApiErrorShape, status: number) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

/**
 * Performs an API request against the standardized envelope:
 *   success -> { data, meta? }
 *   error   -> { error: { code, message, details? } }
 * Returns the full parsed JSON ({ data, meta? }) on success and throws an
 * ApiError on failure, so callers get a consistent interface.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: ApiErrorShape = payload?.error ?? {
      code: "UNKNOWN",
      message: "Request failed",
    };
    throw new ApiError(err, res.status);
  }

  return payload as { data: T; meta?: Record<string, unknown> };
}

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
