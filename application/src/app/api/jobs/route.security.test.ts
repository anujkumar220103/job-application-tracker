import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUserFromRequest, mockCreateJob, mockGetAllJobs, mockFindDuplicateJob } = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockCreateJob: vi.fn(),
  mockGetAllJobs: vi.fn(),
  mockFindDuplicateJob: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromRequest: mockGetUserFromRequest,
}));

vi.mock("@/controllers/jobController", () => ({
  getAllJobs: mockGetAllJobs,
  createJob: mockCreateJob,
  findDuplicateJob: mockFindDuplicateJob,
}));

import { POST, GET } from "@/app/api/jobs/route";

describe("job API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when JWT is missing", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "Acme",
        position: "Engineer",
        location: "Remote",
        status: "applied",
        link: "https://example.com",
      }),
    }));

    expect(response.status).toBe(401);
  });

  it("derives userId from the authenticated JWT and ignores client userId", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 42, email: "user@example.com" });
    mockCreateJob.mockResolvedValue({ id: 1, userId: 42, company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "https://example.com" });

    const response = await POST(new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "Acme",
        position: "Engineer",
        location: "Remote",
        status: "applied",
        link: "https://example.com",
        userId: 999,
      }),
    }));

    expect(response.status).toBe(201);
    expect(mockCreateJob).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
    expect(mockCreateJob).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 999 }));
  });

  it("lists jobs only for the authenticated user", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 7 });
    mockGetAllJobs.mockResolvedValue({ jobs: [{ id: 1, userId: 7, status: "applied" }], total: 1 });

    const response = await GET(new Request("http://localhost/api/jobs", {
      headers: { Authorization: "Bearer valid-token" },
    }));

    expect(response.status).toBe(200);
    // userId is always derived server-side (first arg) regardless of query.
    expect(mockGetAllJobs).toHaveBeenCalledWith(7, expect.objectContaining({ page: 1, limit: 20 }));
  });

  it("rejects invalid status values", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 42 });

    const response = await POST(new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "Acme",
        position: "Engineer",
        location: "Remote",
        status: "pending",
        link: "https://example.com",
      }),
    }));

    expect(response.status).toBe(422);
  });
});
