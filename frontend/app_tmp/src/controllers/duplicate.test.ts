import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    job: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    jobTimelineEvent: { create: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { findDuplicateJob } from "@/controllers/jobController";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findDuplicateJob (Phase 4 duplicate detection)", () => {
  it("scopes the candidate query to the user's own jobs", async () => {
    prismaMock.job.findMany.mockResolvedValue([]);
    await findDuplicateJob(7, { company: "Google", position: "Engineer" });
    const where = prismaMock.job.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe(7);
    expect(where.company).toMatchObject({ mode: "insensitive" });
  });

  it("detects an exact duplicate", async () => {
    prismaMock.job.findMany.mockResolvedValue([
      { id: 11, company: "Google", position: "Engineer", link: "" },
    ]);
    const match = await findDuplicateJob(7, { company: "Google", position: "Engineer" });
    expect(match?.id).toBe(11);
  });

  it("detects a case-insensitive duplicate", async () => {
    prismaMock.job.findMany.mockResolvedValue([
      { id: 12, company: "google", position: "software engineer", link: "" },
    ]);
    const match = await findDuplicateJob(7, { company: "GOOGLE", position: "Software Engineer" });
    expect(match?.id).toBe(12);
  });

  it("normalizes internal whitespace", async () => {
    prismaMock.job.findMany.mockResolvedValue([
      { id: 13, company: "Google", position: "software   engineer", link: "" },
    ]);
    const match = await findDuplicateJob(7, { company: "  Google ", position: "Software Engineer" });
    expect(match?.id).toBe(13);
  });

  it("allows the same company with a different position", async () => {
    prismaMock.job.findMany.mockResolvedValue([
      { id: 14, company: "Google", position: "Engineer", link: "" },
    ]);
    const match = await findDuplicateJob(7, { company: "Google", position: "Product Manager" });
    expect(match).toBeNull();
  });

  it("allows the same position at a different company (no candidates returned)", async () => {
    prismaMock.job.findMany.mockResolvedValue([]); // DB filter by company returns nothing
    const match = await findDuplicateJob(7, { company: "Amazon", position: "Engineer" });
    expect(match).toBeNull();
  });

  it("detects duplicate via matching link under the same company", async () => {
    prismaMock.job.findMany.mockResolvedValue([
      { id: 15, company: "Google", position: "Different Title", link: "https://jobs.example.com/abc" },
    ]);
    const match = await findDuplicateJob(7, {
      company: "Google",
      position: "Another Title",
      link: "https://jobs.example.com/abc",
    });
    expect(match?.id).toBe(15);
  });

  it("excludes the current job id (a job is not its own duplicate)", async () => {
    prismaMock.job.findMany.mockResolvedValue([]);
    await findDuplicateJob(7, { company: "Google", position: "Engineer" }, 99);
    const where = prismaMock.job.findMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: 99 });
  });
});
