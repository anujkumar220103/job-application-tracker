// Pure, dependency-free helper logic for the Job Tracker extension.
//
// This module is the single tested source of truth for the extension's
// non-DOM logic: payload shaping, job validation, apply-label matching, and
// mapping a backend HTTP response to a structured UI result.
//
// It is written to work in three contexts:
//   - Node/Vitest/node:test  (module.exports)
//   - Service worker          (importScripts -> globalThis.JobTrackerCore)
//   - Browser page/content    (window -> globalThis.JobTrackerCore)

(function (root) {
  const APPLY_LABELS = ["easy apply", "apply now", "apply", "quick apply", "submit application"];

  function labelMatchesApply(label) {
    const text = (label || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!text || text.length > 40) return false;
    return APPLY_LABELS.some((l) => text === l || text.startsWith(l));
  }

  function isMeaningful(value) {
    if (!value) return false;
    const v = String(value).trim();
    return v.length > 0 && v.toLowerCase() !== "unknown";
  }

  function validateJob(job) {
    const missing = [];
    if (!isMeaningful(job && job.company)) missing.push("company");
    if (!isMeaningful(job && job.position)) missing.push("position");
    if (!isMeaningful(job && job.location)) missing.push("location");
    if (!/^https?:\/\//i.test((job && job.link) || "")) missing.push("link");
    return { ok: missing.length === 0, missing };
  }

  // Build the exact payload the backend createJobSchema accepts. Drops any
  // extra scraped fields (e.g. domain, date) the backend does not use.
  function buildJobPayload(raw) {
    return {
      company: (raw.company || "").trim(),
      position: (raw.position || "").trim(),
      location: (raw.location || "").trim(),
      status: "applied",
      link: (raw.link || "").trim(),
    };
  }

  function buildJobsUrl(apiBaseUrl) {
    return `${apiBaseUrl}/jobs`;
  }

  // Maps an HTTP status + parsed envelope body into a structured result.
  function mapResponseToResult(status, payload) {
    if (status === 201) {
      const data = (payload && payload.data) || {};
      return {
        success: true,
        type: "JOB_CREATED",
        job: { id: data.id, company: data.company, position: data.position, status: data.status },
      };
    }

    const err = (payload && payload.error) || {};

    if (status === 409 && err.code === "DUPLICATE_APPLICATION") {
      return {
        success: false,
        type: "DUPLICATE_APPLICATION",
        existingJobId: (err.details && err.details.existingJobId) || null,
        company: err.details && err.details.company,
        position: err.details && err.details.position,
        message: err.message || "A similar application already exists.",
      };
    }
    if (status === 401) {
      return { success: false, type: "AUTH_REQUIRED", message: "Your session expired. Please log in again." };
    }
    if (status === 403) {
      return { success: false, type: "FORBIDDEN", message: "You are not allowed to perform this action." };
    }
    if (status === 422) {
      const first = Array.isArray(err.details) && err.details[0] && err.details[0].message ? err.details[0].message : null;
      return { success: false, type: "VALIDATION_ERROR", message: first || "The job details were invalid." };
    }
    return { success: false, type: "SERVER_ERROR", message: "Something went wrong. Please try again." };
  }

  const api = {
    APPLY_LABELS,
    labelMatchesApply,
    isMeaningful,
    validateJob,
    buildJobPayload,
    buildJobsUrl,
    mapResponseToResult,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.JobTrackerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
