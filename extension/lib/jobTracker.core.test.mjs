// Focused tests for the extension's pure logic. Run with: node --test
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Core = require("./jobTracker.core.js");

test("buildJobsUrl appends /jobs to the configured base", () => {
  assert.equal(Core.buildJobsUrl("http://localhost:5000/api"), "http://localhost:5000/api/jobs");
});

test("buildJobPayload keeps only backend-supported fields and forces status=applied", () => {
  const payload = Core.buildJobPayload({
    company: " Google ",
    position: " SWE ",
    location: " Remote ",
    link: " https://x/y ",
    domain: "linkedin.com",
    date: "2026-01-01",
    status: "offer",
  });
  assert.deepEqual(payload, {
    company: "Google",
    position: "SWE",
    location: "Remote",
    status: "applied",
    link: "https://x/y",
  });
});

test("labelMatchesApply accepts apply-like labels", () => {
  for (const label of ["Apply", "Easy Apply", "APPLY NOW", "Quick apply", "Submit application"]) {
    assert.equal(Core.labelMatchesApply(label), true, label);
  }
});

test("labelMatchesApply rejects unrelated or overly long text", () => {
  assert.equal(Core.labelMatchesApply("Learn how to apply for this visa program next year"), false);
  assert.equal(Core.labelMatchesApply("Applicant tracking"), false);
  assert.equal(Core.labelMatchesApply(""), false);
  assert.equal(Core.labelMatchesApply("Save"), false);
});

test("validateJob flags missing/placeholder fields", () => {
  assert.deepEqual(
    Core.validateJob({ company: "Unknown", position: "", location: "Unknown", link: "notaurl" }).missing.sort(),
    ["company", "link", "location", "position"],
  );
  assert.equal(
    Core.validateJob({ company: "Google", position: "SWE", location: "Remote", link: "https://x/y" }).ok,
    true,
  );
});

test("mapResponseToResult: 201 -> JOB_CREATED", () => {
  const r = Core.mapResponseToResult(201, { data: { id: 5, company: "Google", position: "SWE", status: "applied" } });
  assert.equal(r.success, true);
  assert.equal(r.type, "JOB_CREATED");
  assert.equal(r.job.id, 5);
});

test("mapResponseToResult: 409 duplicate -> DUPLICATE_APPLICATION with existingJobId", () => {
  const r = Core.mapResponseToResult(409, {
    error: { code: "DUPLICATE_APPLICATION", message: "dupe", details: { existingJobId: 42, company: "Google", position: "SWE" } },
  });
  assert.equal(r.type, "DUPLICATE_APPLICATION");
  assert.equal(r.existingJobId, 42);
  assert.equal(r.success, false);
});

test("mapResponseToResult: 401 -> AUTH_REQUIRED", () => {
  assert.equal(Core.mapResponseToResult(401, { error: { code: "UNAUTHORIZED" } }).type, "AUTH_REQUIRED");
});

test("mapResponseToResult: 403 -> FORBIDDEN", () => {
  assert.equal(Core.mapResponseToResult(403, { error: { code: "FORBIDDEN" } }).type, "FORBIDDEN");
});

test("mapResponseToResult: 422 -> VALIDATION_ERROR surfaces first field message", () => {
  const r = Core.mapResponseToResult(422, { error: { code: "VALIDATION_ERROR", details: [{ field: "location", message: "location is required" }] } });
  assert.equal(r.type, "VALIDATION_ERROR");
  assert.equal(r.message, "location is required");
});

test("mapResponseToResult: 500 -> generic SERVER_ERROR without internals", () => {
  const r = Core.mapResponseToResult(500, { error: { code: "INTERNAL_ERROR", message: "stack trace..." } });
  assert.equal(r.type, "SERVER_ERROR");
  assert.equal(r.message, "Something went wrong. Please try again.");
});
