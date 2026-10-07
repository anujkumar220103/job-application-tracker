import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockCreateJob, mockGetAllJobs, mockFindDuplicate, mockGetJobById, mockUpdateJob } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateJob: vi.fn(),
  mockGetAllJobs: vi.fn(),
  mockFindDuplicate: vi.fn(),
  mockGetJobById: vi.fn(),
  mockUpdateJob: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUserFromRequest: mockGetUser }));
vi.mock("@/controllers/jobController", () => ({
  getAllJobs: mockGetAllJobs,
  createJob: mockCreateJob,
  findDuplicateJob: mockFindDuplicate,
  getJobById: mockGetJobById,
  updateJob: mockUpdateJob,
  deleteJob: vi.fn(),
}));

import { POST } from "@/app/api/jobs/route";
import { PUT } from "@/app/api/jobs/[id]/route";

const validBody = { company: "Google", position: "Engineer", location: "Remote", status: "applied", link: "" };

function post(body: unknown) {
  return new Request("http://x/api/jobs", {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ id: 7 });
});

describe("POST /api/jobs duplicate detection (Phase 4)", () => {
  it("returns 409 DUPLICATE_APPLICATION when a duplicate exists", async () => {
    mockFindDuplicate.mockResolvedValue({ id: 123, company: "Google", position: "Engineer", status: "applied" });
    const res = await POST(post(validBody));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE_APPLICATION");
    expect(body.error.details.existingJobId).toBe(123);
    expect(mockCreateJob).not.toHaveBeenCalled();
  });

  it("creates normally (201) when no duplicate exists", async () => {
    mockFindDuplicate.mockResolvedValue(null);
    mockCreateJob.mockResolvedValue({ id: 1, ...validBody });
    const res = await POST(post(validBody));
    expect(res.status).toBe(201);
    expect(mockCreateJob).toHaveBeenCalled();
  });

  it("checks for duplicates using the authenticated userId, not a client-supplied one", async () => {
    mockFindDuplicate.mockResolvedValue(null);
    mockCreateJob.mockResolvedValue({ id: 1 });
    await POST(post({ ...validBody, userId: 999 }));
    const [calledUserId] = mockFindDuplicate.mock.calls[0];
    expect(calledUserId).toBe(7);
  });
});

describe("PUT /api/jobs/:id duplicate detection (Phase 4)", () => {
  function put(id: string, body: unknown) {
    return new Request(`http://x/api/jobs/${id}`, {
      method: "PUT",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 409 when editing a job to collide with another", async () => {
    mockGetJobById.mockResolvedValue({ id: 5, userId: 7, company: "Old", position: "Old", link: "" });
    mockFindDuplicate.mockResolvedValue({ id: 8, company: "Google", position: "Engineer", status: "applied" });
    const res = await PUT(put("5", { company: "Google", position: "Engineer" }), { params: { id: "5" } });
    expect(res.status).toBe(409);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it("excludes the job itself from the duplicate query", async () => {
    mockGetJobById.mockResolvedValue({ id: 5, userId: 7, company: "Old", position: "Old", link: "" });
    mockFindDuplicate.mockResolvedValue(null);
    mockUpdateJob.mockResolvedValue({ id: 5, company: "Google", position: "Engineer" });
    const res = await PUT(put("5", { company: "Google", position: "Engineer" }), { params: { id: "5" } });
    expect(res.status).toBe(200);
    const [, , excludeId] = mockFindDuplicate.mock.calls[0];
    expect(excludeId).toBe(5);
  });

  it("does not run a duplicate check when neither company nor position changes", async () => {
    mockGetJobById.mockResolvedValue({ id: 5, userId: 7, company: "Old", position: "Old", link: "" });
    mockUpdateJob.mockResolvedValue({ id: 5, status: "interview" });
    const res = await PUT(put("5", { status: "interview" }), { params: { id: "5" } });
    expect(res.status).toBe(200);
    expect(mockFindDuplicate).not.toHaveBeenCalled();
  });
});
