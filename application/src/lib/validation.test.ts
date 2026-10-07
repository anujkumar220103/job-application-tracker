import { describe, it, expect } from "vitest";
import { createJobSchema, loginSchema, registerSchema, updateJobSchema } from "@/lib/validation";

describe("validation schemas", () => {
  it("accepts valid register input", () => {
    expect(registerSchema.parse({ name: "Alice", email: "alice@example.com", password: "password123" })).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });
  });

  it("rejects malformed register input", () => {
    expect(() => registerSchema.parse({ name: "", email: "bad-email", password: "short" })).toThrow();
  });

  it("accepts valid login input", () => {
    expect(loginSchema.parse({ email: "alice@example.com", password: "password123" })).toMatchObject({
      email: "alice@example.com",
      password: "password123",
    });
  });

  it("rejects malformed login input", () => {
    expect(() => loginSchema.parse({ email: "bad-email", password: "" })).toThrow();
  });

  it("accepts valid create-job input", () => {
    expect(createJobSchema.parse({
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      status: "applied",
      link: "https://example.com/apply",
    })).toMatchObject({
      company: "Acme",
      position: "Engineer",
      status: "applied",
    });
  });

  it("rejects pending and arbitrary statuses for create job", () => {
    expect(() => createJobSchema.parse({
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      status: "pending",
      link: "",
    })).toThrow();

    expect(() => createJobSchema.parse({
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      status: "ghost",
      link: "",
    })).toThrow();
  });

  it("rejects malformed create-job input", () => {
    expect(() => createJobSchema.parse({
      company: "",
      position: "Engineer",
      location: "Remote",
      status: "applied",
      link: "not-a-url",
    })).toThrow();
  });

  it("accepts valid update-job input", () => {
    expect(updateJobSchema.parse({
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      status: "interview",
      link: "https://example.com/callback",
    })).toMatchObject({
      status: "interview",
    });
  });

  it("rejects malformed update-job input", () => {
    expect(() => updateJobSchema.parse({
      company: "",
      status: "pending",
    })).toThrow();
  });
});

import {
  jobsQuerySchema,
  interviewSchema,
  reminderSchema,
  LIMITS,
  MAX_LIMIT,
} from "@/lib/validation";

describe("jobsQuerySchema (Phase 2 query validation)", () => {
  it("applies defaults when nothing is provided", () => {
    const parsed = jobsQuerySchema.parse({});
    expect(parsed).toMatchObject({ sortBy: "createdAt", sortOrder: "desc", page: 1, limit: 20 });
  });

  it("coerces numeric page/limit from strings", () => {
    const parsed = jobsQuerySchema.parse({ page: "3", limit: "50" });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
  });

  it("rejects invalid status", () => {
    expect(() => jobsQuerySchema.parse({ status: "pending" })).toThrow();
  });

  it("rejects invalid sort field", () => {
    expect(() => jobsQuerySchema.parse({ sortBy: "secret" })).toThrow();
  });

  it("rejects limit over the maximum", () => {
    expect(() => jobsQuerySchema.parse({ limit: String(MAX_LIMIT + 1) })).toThrow();
  });

  it("rejects page below 1", () => {
    expect(() => jobsQuerySchema.parse({ page: "0" })).toThrow();
  });

  it("rejects an invalid date", () => {
    expect(() => jobsQuerySchema.parse({ dateFrom: "not-a-date" })).toThrow();
  });

  it("treats empty strings as absent (defaults apply)", () => {
    const parsed = jobsQuerySchema.parse({ search: "", status: "", sortBy: "" });
    expect(parsed.search).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.sortBy).toBe("createdAt");
  });
});

describe("validation hardening — max lengths", () => {
  it("rejects an over-long interview title", () => {
    expect(() =>
      interviewSchema.parse({
        title: "a".repeat(LIMITS.interviewTitle + 1),
        dateTime: new Date().toISOString(),
      }),
    ).toThrow();
  });

  it("rejects over-long reminder notes", () => {
    expect(() =>
      reminderSchema.parse({
        title: "Follow up",
        notes: "a".repeat(LIMITS.notes + 1),
        remindAt: new Date().toISOString(),
      }),
    ).toThrow();
  });

  it("accepts a reminder at the boundary length", () => {
    const parsed = reminderSchema.parse({
      title: "a".repeat(LIMITS.reminderTitle),
      remindAt: new Date().toISOString(),
    });
    expect(parsed.title.length).toBe(LIMITS.reminderTitle);
  });
});
