// Job Tracker content script: detects Apply / Easy Apply actions on supported
// job sites, extracts the job, and sends it to the background worker which
// forwards it to the backend. Scraping strategy is preserved from the original;
// Apply-detection, validation, and user feedback are hardened.

console.log("[Job Tracker] content script active:", window.location.hostname);

const FRONTEND_BASE_URL = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Extraction helpers (preserved from the original implementation)
// ---------------------------------------------------------------------------
function cleanLocation(rawText) {
  if (!rawText) return "";
  const parts = rawText.split(/·|•|\||,/);
  if (rawText.includes(",")) {
    const match = rawText.match(/^.*?,.*?(?=·|•|\||$)/);
    return match ? match[0].trim() : parts[0].trim();
  }
  return parts[0].trim();
}

function getText1(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const firstSpan = el.querySelector("span span, span:first-child");
    if (firstSpan?.innerText?.trim()) return firstSpan.innerText.trim();
  }
  return "";
}

function getText(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim().length > 0) {
      return el.innerText.trim();
    }
  }
  return "";
}

function extractJob() {
  const link = window.location.href;

  const position = getText([
    "h1",
    "h2",
    ".job-title",
    ".topcard__title",
    ".internship-title",
    ".profile-header h1",
  ]);

  const company = getText([
    "div[aria-label='Company']",
    ".topcard__org-name-link",
    ".company-name",
    ".job-card-container__company-name",
    ".job-card-list__company-name",
    ".internship-company-name",
    ".profile-header .company",
    "div.company .heading_6.company_name",
    ".org_name ng-star-inserted",
    ".job-details-jobs-unified-top-card__company-name a",
  ]);

  const rawLocation = getText1([
    "span[aria-label='Location']",
    ".topcard__flavor--bullet",
    ".job-card-container__metadata-item",
    ".job-card-list__location",
    ".internship-location",
    ".location",
    "#location_names",
    ".job-details-jobs-unified-top-card__primary-description-container",
  ]);
  const location = cleanLocation(rawLocation);

  return { company, position, location, status: "applied", link };
}

// ---------------------------------------------------------------------------
// Shared pure logic (validation + apply-label matching) from the tested core.
// jobTracker.core.js is injected before this script via the manifest.
// ---------------------------------------------------------------------------
const Core = globalThis.JobTrackerCore;

function validateJob(job) {
  return Core.validateJob(job);
}

// ---------------------------------------------------------------------------
// Apply-button detection
// ---------------------------------------------------------------------------
function findApplyControl(target) {
  // Only treat real interactive controls as Apply buttons.
  const control = target.closest("button, a, [role='button'], input[type='submit']");
  if (!control) return null;
  const label =
    control.innerText ||
    control.value ||
    control.getAttribute("aria-label") ||
    "";
  return Core.labelMatchesApply(label) ? control : null;
}

// ---------------------------------------------------------------------------
// Lightweight in-page feedback banner (no framework, no alert())
// ---------------------------------------------------------------------------
function showBanner({ title, message, actionLabel, actionUrl, variant }) {
  const existing = document.getElementById("job-tracker-banner");
  if (existing) existing.remove();

  const colors = {
    success: "#0f7b6c",
    error: "#b23b3b",
    warning: "#b26a00",
    info: "#2b4b6f",
  };
  const bg = colors[variant] || colors.info;

  const box = document.createElement("div");
  box.id = "job-tracker-banner";
  box.setAttribute("role", "status");
  box.style.cssText = [
    "position:fixed", "bottom:20px", "right:20px", "z-index:2147483647",
    "max-width:320px", "padding:14px 16px", "border-radius:10px",
    `background:${bg}`, "color:#fff", "font:14px/1.4 system-ui,sans-serif",
    "box-shadow:0 6px 20px rgba(0,0,0,0.25)",
  ].join(";");

  const h = document.createElement("div");
  h.style.cssText = "font-weight:700;margin-bottom:4px";
  h.textContent = title;
  box.appendChild(h);

  if (message) {
    const p = document.createElement("div");
    p.textContent = message;
    box.appendChild(p);
  }

  const row = document.createElement("div");
  row.style.cssText = "margin-top:10px;display:flex;gap:8px;justify-content:flex-end";

  if (actionLabel && actionUrl) {
    const a = document.createElement("a");
    a.textContent = actionLabel;
    a.href = actionUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.style.cssText = "background:#fff;color:#111;padding:6px 10px;border-radius:6px;text-decoration:none;font-weight:600";
    row.appendChild(a);
  }

  const close = document.createElement("button");
  close.textContent = "Close";
  close.style.cssText = "background:rgba(255,255,255,0.2);color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:600";
  close.addEventListener("click", () => box.remove());
  row.appendChild(close);

  box.appendChild(row);
  document.body.appendChild(box);

  if (variant === "success") {
    setTimeout(() => box.remove(), 5000);
  }
}

function handleResult(result) {
  if (!result) {
    showBanner({ title: "Job Tracker", message: "No response from the extension.", variant: "error" });
    return;
  }

  switch (result.type) {
    case "JOB_CREATED": {
      const j = result.job || {};
      const detail = [j.company, j.position].filter(Boolean).join(" — ");
      showBanner({ title: "✓ Job added to Job Tracker", message: detail || undefined, variant: "success" });
      break;
    }
    case "DUPLICATE_APPLICATION": {
      const detail = [result.company, result.position].filter(Boolean).join(" — ");
      showBanner({
        title: "⚠ Duplicate application",
        message: `${detail ? detail + "\n" : ""}This application already exists in your tracker.`,
        actionLabel: "View existing",
        actionUrl: `${FRONTEND_BASE_URL}/jobs`,
        variant: "warning",
      });
      break;
    }
    case "AUTH_REQUIRED":
      showBanner({
        title: "Sign in required",
        message: result.message || "Please log in to your Job Tracker.",
        actionLabel: "Open Job Tracker",
        actionUrl: `${FRONTEND_BASE_URL}/login`,
        variant: "info",
      });
      break;
    case "VALIDATION_ERROR":
      showBanner({ title: "Could not save job", message: result.message, variant: "error" });
      break;
    case "FORBIDDEN":
    case "SERVER_ERROR":
    case "NETWORK_ERROR":
    default:
      showBanner({ title: "Could not save job", message: result.message || "Please try again.", variant: "error" });
  }
}

// ---------------------------------------------------------------------------
// Capture flow
// ---------------------------------------------------------------------------
let lastTriggerAt = 0;

function captureApplication(token) {
  const now = Date.now();
  if (now - lastTriggerAt < 1500) return; // debounce repeated triggers
  lastTriggerAt = now;

  const job = extractJob();
  const check = validateJob(job);
  if (!check.ok) {
    showBanner({
      title: "Couldn't read job details",
      message: `Missing: ${check.missing.join(", ")}. Open the full job page and try again.`,
      variant: "error",
    });
    return;
  }

  if (!chrome?.runtime?.id) {
    console.warn("[Job Tracker] Extension context unavailable; skipping.");
    return;
  }

  chrome.runtime.sendMessage({ type: "LOG_JOB", data: job, token }, (result) => {
    if (chrome.runtime.lastError) {
      showBanner({ title: "Could not save job", message: "Extension messaging failed.", variant: "error" });
      return;
    }
    handleResult(result);
  });
}

// Attach a single delegated click listener; read the token at click time so a
// freshly-synced session is picked up without reloading the page.
document.addEventListener("click", (e) => {
  const control = findApplyControl(e.target);
  if (!control) return;

  chrome.storage.local.get("token", ({ token }) => {
    captureApplication(token || null);
  });
});
