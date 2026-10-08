// Centralized Job Tracker extension configuration.
//
// Single source of truth for the backend API base URL and the frontend origin.
// All extension scripts (background, popup) read from here instead of hardcoding
// URLs. Update these values to match your running environment.
//
// Current values point at the deployed production frontend/backend. For local
// development, change these to http://localhost:5000/api and
// http://localhost:3000 (and keep manifest.json host_permissions /
// content_scripts matches in sync).

const JOB_TRACKER_CONFIG = {
  // Base URL of the backend API. Includes the "/api" prefix so callers can do
  // `${API_BASE_URL}/jobs`.
  API_BASE_URL: "https://job-application-tracker-90dg.onrender.com/api",

  // Frontend origin, used to open the dashboard / existing applications.
  FRONTEND_BASE_URL: "https://job-application-tracker-pi-five.vercel.app",
};

// Expose for service worker (importScripts) and popup (window) contexts.
if (typeof globalThis !== "undefined") {
  globalThis.JOB_TRACKER_CONFIG = JOB_TRACKER_CONFIG;
}
