import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetJobById, prismaMock, mockAddTimelineEvent } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetJobById: vi.fn(),
  mockAddTimelineEvent: vi.fn().mockResolvedValue(undefined),
  prismaMock: {
    interview: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    job: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getUserFromRequest: mockGetUser }));
vi.mock("@/controllers/jobController", () => ({ getJobById: mockGetJobById }));
vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/timeline", async (orig) => {
  const actual = await orig<typeof import("@/lib/timeline")>();
  return { ...actual, addTimelineEvent: mockAddTimelineEvent };
});

import { GET as listInterviews, POST as createInterview } from "@/app/api/jobs/[id]/interviews/route";
import { PUT as updateInterview, DELETE as deleteInterview } from "@/app/api/interviews/[id]/route";

const OWNER = { id: 7, email: "owner@example.com" };
const JOB = { id: 10, userId: 7, company: "Acme", position: "Eng" };

function authReq(url: string, method = "GET", body?: unknown) {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue(OWNER);
  mockGetJobById.mockResolvedValue(JOB);
  prismaMock.job.findUnique.mockResolvedValue(JOB);
});

describe("Interview CRUD + ownership (Phase 3)", () => {
  it("rejects unauthenticated list", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await listInterviews(authReq("http://x/api/jobs/10/interviews"), { params: { id: "10" } });
    expect(res.status).toBe(401);
  });

  it("blocks listing interviews for another user's job", async () => {
    mockGetJobById.mockResolvedValue({ ...JOB, userId: 99 });
    const res = await listInterviews(authReq("http://x/api/jobs/10/interviews"), { params: { id: "10" } });
    expect(res.status).toBe(403);
  });

  it("lists interviews for the owner", async () => {
    prismaMock.interview.findMany.mockResolvedValue([{ id: 1 }]);
    const res = await listInterviews(authReq("http://x/api/jobs/10/interviews"), { params: { id: "10" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates an interview and writes an interview_scheduled timeline event", async () => {
    prismaMock.interview.create.mockResolvedValue({ id: 5, title: "Phone screen" });
    const res = await createInterview(
      authReq("http://x/api/jobs/10/interviews", "POST", { title: "Phone screen", dateTime: new Date().toISOString() }),
      { params: { id: "10" } },
    );
    expect(res.status).toBe(201);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "interview_scheduled" }));
  });

  it("rejects invalid interview payload", async () => {
    const res = await createInterview(
      authReq("http://x/api/jobs/10/interviews", "POST", { title: "", dateTime: "nope" }),
      { params: { id: "10" } },
    );
    expect(res.status).toBe(422);
  });

  it("updating to completed writes interview_completed (not interview_updated)", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({ id: 5, jobId: 10, title: "Phone", status: "scheduled" });
    prismaMock.interview.update.mockResolvedValue({ id: 5, jobId: 10, title: "Phone", status: "completed" });
    const res = await updateInterview(
      authReq("http://x/api/interviews/5", "PUT", { status: "completed" }),
      { params: { id: "5" } },
    );
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "interview_completed" }));
  });

  it("updating to cancelled writes interview_cancelled", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({ id: 5, jobId: 10, title: "Phone", status: "scheduled" });
    prismaMock.interview.update.mockResolvedValue({ id: 5, jobId: 10, title: "Phone", status: "cancelled" });
    const res = await updateInterview(
      authReq("http://x/api/interviews/5", "PUT", { status: "cancelled" }),
      { params: { id: "5" } },
    );
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "interview_cancelled" }));
  });

  it("a non-status edit writes a generic interview_updated event", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({ id: 5, jobId: 10, title: "Phone", status: "scheduled" });
    prismaMock.interview.update.mockResolvedValue({ id: 5, jobId: 10, title: "Phone screen", status: "scheduled" });
    const res = await updateInterview(
      authReq("http://x/api/interviews/5", "PUT", { title: "Phone screen" }),
      { params: { id: "5" } },
    );
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "interview_updated" }));
  });

  it("blocks updating another user's interview", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({ id: 5, jobId: 10, status: "scheduled" });
    prismaMock.job.findUnique.mockResolvedValue({ id: 10, userId: 99 });
    const res = await updateInterview(
      authReq("http://x/api/interviews/5", "PUT", { status: "completed" }),
      { params: { id: "5" } },
    );
    expect(res.status).toBe(403);
    expect(prismaMock.interview.update).not.toHaveBeenCalled();
  });

  it("deletes an interview and writes interview_deleted", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({ id: 5, jobId: 10, title: "Phone" });
    prismaMock.interview.delete.mockResolvedValue({ id: 5 });
    const res = await deleteInterview(authReq("http://x/api/interviews/5", "DELETE"), { params: { id: "5" } });
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "interview_deleted" }));
  });

  it("blocks deleting another user's interview", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({ id: 5, jobId: 10 });
    prismaMock.job.findUnique.mockResolvedValue({ id: 10, userId: 99 });
    const res = await deleteInterview(authReq("http://x/api/interviews/5", "DELETE"), { params: { id: "5" } });
    expect(res.status).toBe(403);
    expect(prismaMock.interview.delete).not.toHaveBeenCalled();
  });
});
