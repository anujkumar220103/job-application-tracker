// Job Tracker content script: detects Apply / Easy Apply actions on supported
// job sites, extracts whatever job info is available, and sends it to the
// background worker which forwards it to the backend.
//
// BEST-EFFORT CAPTURE: a missing field (e.g. location on Internshala) must NOT
// block job creation. We capture what we can; the backend fills safe
// placeholders for any missing required field, and the user corrects all five
// fields later from the dashboard Edit UI.

// NOTE: The whole script is wrapped in an IIFE so the service worker can
// RE-INJECT it into an already-open tab after an extension reload WITHOUT the
// top-level `const`/`function` declarations colliding ("Identifier already
// declared"). Function scope makes each injection self-contained; the init
// guard at the bottom ensures only one live listener exists. No scraping logic
// is changed by this wrapper.
(function () {
console.log("[Job Tracker] content script active:", window.location.hostname);

const FRONTEND_BASE_URL = "https://job-application-tracker-pi-five.vercel.app";

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
  // Internshala often renders location in these containers; try them too, but
  // never block capture if nothing is found (best-effort).
  const location = cleanLocation(
    rawLocation ||
      getText([
        "#location_names",
        ".location_names",
        ".individual_internship_details .location",
        ".detail_view .location_link",
      ]),
  );

  // status is always "applied" for an Apply-triggered capture; the backend
  // fills placeholders for any empty company/position/location.
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

// ===========================================================================
// PLATFORM ROUTING
// LinkedIn gets dedicated logic (below). Internshala / Unstop keep using the
// EXISTING generic extractJob() + findApplyControl() path, unchanged.
// ===========================================================================
function isLinkedIn() {
  return /(^|\.)linkedin\.com$/i.test(window.location.hostname);
}

// ---------------------------------------------------------------------------
// Apply-button detection (generic — used by Internshala/Unstop, UNCHANGED)
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

// ===========================================================================
// LINKEDIN-SPECIFIC LOGIC (isolated; does not touch Internshala/Unstop)
// ===========================================================================

// Finds the currently SELECTED job detail panel on LinkedIn's SPA job views.
// Tries the known detail containers in priority order; returns an element to
// scope extraction to (so sidebar/recommended jobs are ignored).
function getLinkedInDetailRoot() {
  const candidates = [
    ".jobs-search__job-details--container",
    ".jobs-details__main-content",
    ".job-view-layout",
    ".jobs-details",
    "[class*='job-details-jobs-unified-top-card']",
    ".topcard", // standalone /jobs/view/ pages
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function textOf(el) {
  const t = el && el.textContent ? el.textContent.replace(/\s+/g, " ").trim() : "";
  return t;
}

// Reads structured data (JSON-LD JobPosting) if LinkedIn provides it.
function linkedInJsonLd() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      let json;
      try {
        json = JSON.parse(s.textContent || "{}");
      } catch {
        continue;
      }
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        if (node && (node["@type"] === "JobPosting" || node.title)) return node;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractLinkedInPosition(root, ld) {
  // 1) Detail-panel heading selectors (most reliable, scoped to selected job)
  const scoped = root
    ? root.querySelector(
        ".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .topcard__title, h1, h2",
      )
    : null;
  if (scoped && textOf(scoped)) return textOf(scoped);
  // 2) Structured data
  if (ld && ld.title) return String(ld.title).trim();
  return "";
}

function extractLinkedInCompany(root, ld) {
  // ROLLBACK: restored to the last known-good company extraction (the version
  // that let LinkedIn jobs be captured end-to-end; company was sometimes wrong
  // but capture never failed). Company extraction must never block submission.
  // 1) Company anchor/name within the selected detail panel
  const scoped = root
    ? root.querySelector(
        ".job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name, .topcard__org-name-link, a[href*='/company/']",
      )
    : null;
  if (scoped && textOf(scoped)) return textOf(scoped);
  // 2) Structured data (hiringOrganization.name)
  if (ld && ld.hiringOrganization && ld.hiringOrganization.name) {
    return String(ld.hiringOrganization.name).trim();
  }
  return "";
}

function extractLinkedInLocation(root, ld) {
  // 1) The primary description container holds "Company · Location · ago".
  //    Prefer a dedicated bullet when present; otherwise parse the container.
  if (root) {
    const tertiary = root.querySelector(
      ".job-details-jobs-unified-top-card__primary-description-container, .jobs-unified-top-card__primary-description, .topcard__flavor--bullet",
    );
    const raw = textOf(tertiary);
    if (raw) {
      // Parse the "Company · Location · ago · applicants" string. Pure logic
      // lives in the tested core (parseLinkedInLocationFromPrimary).
      const parsed = Core.parseLinkedInLocationFromPrimary(raw);
      if (parsed) return parsed;
    }
  }
  // 2) Structured data (jobLocation.address.addressLocality/Region/Country)
  if (ld && ld.jobLocation) {
    const loc = Array.isArray(ld.jobLocation) ? ld.jobLocation[0] : ld.jobLocation;
    const addr = loc && loc.address;
    if (addr) {
      const bits = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
        .filter(Boolean)
        .map((x) => (typeof x === "string" ? x : x.name))
        .filter(Boolean);
      if (bits.length) return bits.join(", ");
    }
  }
  return "";
}

// Best-effort LinkedIn job extraction, scoped to the selected job.
function extractLinkedInJob() {
  const root = getLinkedInDetailRoot();
  const ld = linkedInJsonLd();

  const position = extractLinkedInPosition(root, ld);
  const company = extractLinkedInCompany(root, ld);
  const location = extractLinkedInLocation(root, ld);
  const link = window.location.href;

  return { company, position, location, status: "applied", link };
}

// LinkedIn Apply / Easy Apply detection: only real apply controls inside the
// job detail area, not sidebar cards or unrelated "apply" text.
function isLinkedInApplyAction(target) {
  const control = target.closest("button, a, [role='button']");
  if (!control) return null;

  const label = (
    control.innerText ||
    control.value ||
    control.getAttribute("aria-label") ||
    ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!label || label.length > 40) return null;

  // LinkedIn-specific apply affordances.
  const looksApply =
    label === "apply" ||
    label === "easy apply" ||
    label.startsWith("easy apply") ||
    label.startsWith("apply to ") ||
    control.className.toString().includes("jobs-apply-button") ||
    (control.id || "").includes("jobs-apply-button");
  if (!looksApply) return null;

  // Must be within the job detail area, not a left-rail job card.
  const inDetail = control.closest(
    ".jobs-apply-button--top-card, .jobs-s-apply, .jobs-details, .job-view-layout, [class*='job-details-jobs-unified-top-card'], .jobs-search__job-details--container",
  );
  // Standalone /jobs/view/ pages may not have those wrappers; allow if the
  // control itself is a LinkedIn apply button.
  const isApplyBtnClass =
    control.className.toString().includes("jobs-apply-button") ||
    (control.id || "").includes("jobs-apply-button");

  return inDetail || isApplyBtnClass ? control : null;
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

function handleResult(result, missing = []) {
  if (!result) {
    showBanner({ title: "Job Tracker", message: "No response from the extension.", variant: "error" });
    return;
  }

  switch (result.type) {
    case "JOB_CREATED": {
      const j = result.job || {};
      const detail = [j.company, j.position].filter(Boolean).join(" — ");
      // Best-effort: let the user know which fields were auto-filled and can be
      // completed from the dashboard. This is a confirmation, not an error.
      const hint = missing && missing.length
        ? `${detail ? detail + "\n" : ""}Add ${missing.join(", ")} from your dashboard when you have a moment.`
        : detail || undefined;
      showBanner({
        title: "✓ Job added to Job Tracker",
        message: hint,
        actionLabel: missing && missing.length ? "Open dashboard" : undefined,
        actionUrl: missing && missing.length ? `${FRONTEND_BASE_URL}/jobs` : undefined,
        variant: "success",
      });
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

function captureApplication(token, job) {
  const now = Date.now();
  if (now - lastTriggerAt < 1500) return; // debounce repeated triggers
  lastTriggerAt = now;

  // BEST-EFFORT: we do NOT abort when a field is missing. validateJob is used
  // only to tell the user afterwards which fields they may want to complete.
  const check = validateJob(job);

  // Guard against an invalidated/orphaned extension context (e.g. after the
  // extension was reloaded while this tab stayed open). Calling chrome.* in
  // that state is what produces repeated "chrome-extension://invalid/
  // net::ERR_FAILED" errors, so we bail out cleanly instead.
  if (!extensionContextAlive()) {
    console.warn("[Job Tracker] Extension was reloaded; please refresh this tab to re-capture.");
    return;
  }

  chrome.runtime.sendMessage({ type: "LOG_JOB", data: job, token, missing: check.missing }, (result) => {
    if (chrome.runtime.lastError) {
      // Context went away between the guard and the callback — stay silent to
      // avoid noisy invalid-URL errors; the user can refresh the tab.
      return;
    }
    handleResult(result, check.missing);
  });
}

// True only when the content script still has a live connection to its
// extension. Accessing chrome.runtime.id on an orphaned context is safe.
function extensionContextAlive() {
  try {
    return Boolean(chrome && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

// The single delegated Apply click handler. Reads the token at click time so a
// freshly-synced session is picked up without reloading the page.
function jobTrackerClickHandler(e) {
  // If THIS content-script instance has been superseded (a fresh instance was
  // re-injected after an extension reload), do nothing — the fresh instance
  // owns capture now. This neutralizes the orphaned instance's listener.
  if (window.__JOB_TRACKER_GENERATION__ !== JOB_TRACKER_GENERATION) return;

  // Platform routing: LinkedIn uses dedicated detection + extraction; all other
  // supported sites (Internshala, Unstop) use the EXISTING generic path.
  const control = isLinkedIn() ? isLinkedInApplyAction(e.target) : findApplyControl(e.target);
  if (!control) return;

  // Bail before touching chrome.* if the context is dead (orphaned instance).
  if (!extensionContextAlive()) {
    console.warn("[Job Tracker] This tab's connection is stale; recovering…");
    return;
  }

  const job = isLinkedIn() ? extractLinkedInJob() : extractJob();

  chrome.storage.local.get("token", ({ token }) => {
    if (chrome.runtime.lastError) return; // context died; stay silent
    captureApplication(token || null, job);
  });
}

// ---------------------------------------------------------------------------
// Idempotent initialization. The service worker re-injects this script into
// already-open supported tabs after an extension reload (so the user does not
// have to refresh the page). This guard ensures:
//   - only ONE live click listener exists at a time (no duplicate submissions)
//   - a newly injected instance supersedes any older/orphaned instance
// A monotonically increasing generation stamp identifies the active instance.
// ---------------------------------------------------------------------------
const JOB_TRACKER_GENERATION = Date.now();

(function initJobTracker() {
  // Remove a previously registered handler (from an earlier injection) so we
  // never stack listeners, then register this instance's handler once.
  if (typeof window.__JOB_TRACKER_REMOVE__ === "function") {
    try {
      window.__JOB_TRACKER_REMOVE__();
    } catch {
      /* ignore */
    }
  }

  window.__JOB_TRACKER_GENERATION__ = JOB_TRACKER_GENERATION;
  window.__JOB_TRACKER_INITIALIZED__ = true;

  document.addEventListener("click", jobTrackerClickHandler, true);
  window.__JOB_TRACKER_REMOVE__ = () =>
    document.removeEventListener("click", jobTrackerClickHandler, true);

  console.log("[Job Tracker] content script initialized (gen", JOB_TRACKER_GENERATION, ")");
})();

// Test-only hook: expose internals for unit tests WITHOUT affecting production.
// Chrome's content-script run never sets this flag, so this block is inert in
// the browser; it only runs under the test harness.
try {
  if (typeof globalThis !== "undefined" && globalThis.__JOBTRACKER_EXPOSE_FOR_TEST__) {
    globalThis.__test = {
      isLinkedIn,
      extractJob,
      findApplyControl,
      extractLinkedInJob,
      isLinkedInApplyAction,
    };
  }
} catch {
  /* ignore */
}

// Close the outer IIFE that wraps the whole content script (opened near the
// top) so the file can be safely re-injected without top-level redeclaration.
})();
