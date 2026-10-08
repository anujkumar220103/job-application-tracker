// Resolves the backend API base URL and GUARANTEES it ends with "/api", so the
// app works whether NEXT_PUBLIC_API_URL is configured as the bare backend
// origin (e.g. https://api.example.com) or already includes the suffix
// (e.g. https://api.example.com/api). This prevents 404s like
// POST /auth/register when the env var omits "/api".
//
// All API paths are then appended as "/auth/login", "/jobs", etc.
function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  // Default to same-origin "/api" (used when no backend origin is configured).
  if (!configured) return "/api";

  // Strip any trailing slash(es).
  let base = configured.replace(/\/+$/, "");

  // Ensure the path ends with "/api" exactly once.
  if (!/\/api$/i.test(base)) {
    base = `${base}/api`;
  }

  return base;
}

export const API_BASE_URL = resolveApiBaseUrl();
