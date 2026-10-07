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

import { createJob, updateJob, getAllJobs } from "@/controllers/jobController";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("jobController timeline + query behavior", () => {
  it("creating a job writes a 'created' timeline event", async () => {
    prismaMock.job.create.mockResolvedValue({ id: 1, company: "Acme", position: "Eng", status: "applied" });
    await createJob({ company: "Acme", position: "Eng", location: "Remote", status: "applied", link: "", userId: 7 });
    expect(prismaMock.jobTimelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "created" }) }),
    );
  });

  it("changing status writes a 'status_changed' timeline event", async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 1, company: "Acme", position: "Eng", location: "Remote", status: "applied", link: "" });
    prismaMock.job.update.mockResolvedValue({ id: 1, status: "interview" });
    await updateJob(1, { status: "interview" });
    expect(prismaMock.jobTimelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "status_changed" }) }),
    );
  });

  it("not changing status does NOT write a status_changed event", async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 1, company: "Acme", position: "Eng", location: "Remote", status: "applied", link: "" });
    prismaMock.job.update.mockResolvedValue({ id: 1, status: "applied" });
    await updateJob(1, { company: "Acme Inc" });
    expect(prismaMock.jobTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("getAllJobs scopes the query to the given userId and paginates", async () => {
    prismaMock.job.findMany.mockResolvedValue([{ id: 1 }]);
    prismaMock.job.count.mockResolvedValue(1);
    const result = await getAllJobs(7, {
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    });
    expect(prismaMock.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 7 }), skip: 0, take: 20 }),
    );
    expect(result).toEqual({ jobs: [{ id: 1 }], total: 1 });
  });

  it("getAllJobs applies search across company/position/location scoped to the user", async () => {
    prismaMock.job.findMany.mockResolvedValue([]);
    prismaMock.job.count.mockResolvedValue(0);
    await getAllJobs(7, { search: "google", sortBy: "createdAt", sortOrder: "desc", page: 1, limit: 20 });
    const call = prismaMock.job.findMany.mock.calls[0][0];
    expect(call.where.userId).toBe(7);
    expect(JSON.stringify(call.where)).toContain("google");
  });
});
