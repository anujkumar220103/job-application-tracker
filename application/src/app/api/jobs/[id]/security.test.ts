import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUserFromRequest, mockGetJobById, mockUpdateJob, mockDeleteJob, mockFindDuplicateJob } = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockGetJobById: vi.fn(),
  mockUpdateJob: vi.fn(),
  mockDeleteJob: vi.fn(),
  mockFindDuplicateJob: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromRequest: mockGetUserFromRequest,
}));

vi.mock("@/controllers/jobController", () => ({
  getJobById: mockGetJobById,
  updateJob: mockUpdateJob,
  deleteJob: mockDeleteJob,
  findDuplicateJob: mockFindDuplicateJob,
}));

import { GET, PUT, DELETE } from "@/app/api/jobs/[id]/route";

describe("job ownership API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a user to access their own job", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 7, email: "alice@example.com" });
    mockGetJobById.mockResolvedValue({ id: 12, userId: 7, company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "" });

    const response = await GET(new Request("http://localhost/api/jobs/12", {
      headers: { Authorization: "Bearer valid-token" },
    }), { params: { id: "12" } });

    expect(response.status).toBe(200);
  });

  it("blocks access to another user's job", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 7, email: "alice@example.com" });
    mockGetJobById.mockResolvedValue({ id: 12, userId: 99, company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "" });

    const response = await GET(new Request("http://localhost/api/jobs/12", {
      headers: { Authorization: "Bearer valid-token" },
    }), { params: { id: "12" } });

    expect(response.status).toBe(403);
  });

  it("blocks updating another user's job", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 7, email: "alice@example.com" });
    mockGetJobById.mockResolvedValue({ id: 12, userId: 99, company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "" });

    const response = await PUT(new Request("http://localhost/api/jobs/12", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ company: "Changed", status: "interview" }),
    }), { params: { id: "12" } });

    expect(response.status).toBe(403);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it("blocks deleting another user's job", async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: 7, email: "alice@example.com" });
    mockGetJobById.mockResolvedValue({ id: 12, userId: 99, company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "" });

    const response = await DELETE(new Request("http://localhost/api/jobs/12", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    }), { params: { id: "12" } });

    expect(response.status).toBe(403);
    expect(mockDeleteJob).not.toHaveBeenCalled();
  });

  it("rejects invalid JWT on a protected job route", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/jobs/12", {
      headers: { Authorization: "Bearer invalid-token" },
    }), { params: { id: "12" } });

    expect(response.status).toBe(401);
  });
});
