// Bridges the frontend's JWT (localStorage["token"]) into the extension's
// chrome.storage.local so content/background scripts can authenticate.
// Does NOT log the token or any sensitive value.

(function syncToken() {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      // Clear any stale token so the extension reflects a logged-out state.
      chrome.storage.local.remove("token", () => {
        if (chrome.runtime.lastError) {
          console.warn("[Job Tracker] Could not clear stored token.");
        }
      });
      console.warn("[Job Tracker] No token found. Log in to sync your session.");
      return;
    }

    chrome.storage.local.set({ token }, () => {
      if (chrome.runtime.lastError) {
        console.warn("[Job Tracker] Could not save token to extension storage.");
        return;
      }
      // Confirmation only — never log the token value.
      console.log("[Job Tracker] Session synced to extension.");
    });
  } catch {
    console.warn("[Job Tracker] Unable to read the session token.");
  }
})();
