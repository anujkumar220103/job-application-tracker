// Centralized Job Tracker extension configuration.
//
// Single source of truth for the backend API base URL and the frontend origin.
// All extension scripts (background, popup) read from here instead of hardcoding
// URLs. Update these values to match your running environment.
//
// NOTE: No production URL is invented here. For development the backend runs on
// http://localhost:5000 and the frontend on http://localhost:3000. When you
// deploy, replace these with your real origins (and keep manifest.json
// host_permissions / content_scripts matches in sync).

const JOB_TRACKER_CONFIG = {
  // Base URL of the Express backend API. Includes the "/api" prefix so callers
  // can do `${API_BASE_URL}/jobs`.
  API_BASE_URL: "http://localhost:5000/api",

  // Frontend origin, used to open the dashboard / existing applications.
  FRONTEND_BASE_URL: "http://localhost:3000",
};

// Expose for service worker (importScripts) and popup (window) contexts.
if (typeof globalThis !== "undefined") {
  globalThis.JOB_TRACKER_CONFIG = JOB_TRACKER_CONFIG;
}
