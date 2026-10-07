// Background service worker: receives scraped jobs from content.js and sends
// them to the Job Tracker backend. Centralized config, explicit status-code
// handling, and no logging of tokens or auth headers.

importScripts("config.js", "lib/jobTracker.core.js");

const API_BASE_URL = globalThis.JOB_TRACKER_CONFIG.API_BASE_URL;
const Core = globalThis.JobTrackerCore;

/**
 * Sends a job to the backend and returns a structured result. Response→result
 * mapping and payload shaping live in the tested JobTrackerCore module.
 * Never surfaces raw server internals.
 */
async function sendJobToBackend(job, token) {
  if (!token) {
    return { success: false, type: "AUTH_REQUIRED", message: "Please log in to your Job Tracker first." };
  }

  let res;
  try {
    res = await fetch(Core.buildJobsUrl(API_BASE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(Core.buildBestEffortPayload(job)),
    });
  } catch {
    return { success: false, type: "NETWORK_ERROR", message: "Could not reach the Job Tracker server." };
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  return Core.mapResponseToResult(res.status, payload);
}

// ---------------------------------------------------------------------------
// Lifecycle recovery: after the extension is installed/updated/reloaded, the
// content script already running in open tabs is orphaned (its chrome.* APIs
// are dead and cannot be revived in place — an MV3 constraint). To avoid
// forcing the user to manually refresh, the service worker re-injects a fresh
// content script into already-open supported tabs. The content script's
// init guard ensures no duplicate listeners/submissions result.
// ---------------------------------------------------------------------------
const SUPPORTED_URL_MATCHES = [
  "*://*.linkedin.com/*",
  "*://*.unstop.com/*",
  "*://*.internshala.com/*",
];

function reinjectIntoOpenTabs() {
  // Guard: chrome.scripting may be unavailable in some contexts.
  if (!chrome.scripting || !chrome.tabs) return;

  chrome.tabs.query({ url: SUPPORTED_URL_MATCHES }, (tabs) => {
    if (chrome.runtime.lastError) return;
    for (const tab of tabs || []) {
      if (typeof tab.id !== "number") continue;
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          // Inject the shared core first, then the content script — same order
          // as the manifest's declarative content_scripts.
          files: ["lib/jobTracker.core.js", "content.js"],
        },
        () => {
          // Swallow expected errors (e.g. restricted pages, tab closed).
          void chrome.runtime.lastError;
        },
      );
    }
  });
}

// Fires on install, update, and when the user clicks "Reload" in
// chrome://extensions (treated as an update/install of the unpacked extension).
chrome.runtime.onInstalled.addListener(reinjectIntoOpenTabs);
// Fires when the browser starts and the service worker spins up.
chrome.runtime.onStartup.addListener(reinjectIntoOpenTabs);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LOG_JOB") {
    const job = message.data;
    const token = message.token;

    // Minimal, production-safe logging. Never log the token or auth header.
    console.log("[Job Tracker] Submitting job:", job?.company, "-", job?.position);

    sendJobToBackend(job, token).then((result) => {
      // Persist the latest result for optional popup display.
      chrome.storage.local.set({ lastResult: { ...result, at: Date.now() } });
      sendResponse(result);
    });

    // Return true to keep the message channel open for the async response.
    return true;
  }
  return undefined;
});
