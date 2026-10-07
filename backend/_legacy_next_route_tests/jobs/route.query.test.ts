import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUserFromRequest, mockGetAllJobs, mockCreateJob } = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockGetAllJobs: vi.fn(),
  mockCreateJob: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUserFromRequest: mockGetUserFromRequest }));
vi.mock("@/controllers/jobController", () => ({
  getAllJobs: mockGetAllJobs,
  createJob: mockCreateJob,
}));

import { GET } from "@/app/api/jobs/route";

function req(url: string) {
  return new Request(url, { headers: { Authorization: "Bearer t" } });
}

describe("GET /api/jobs server-side query (Phase 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromRequest.mockResolvedValue({ id: 7 });
    mockGetAllJobs.mockResolvedValue({ jobs: [], total: 0 });
  });

  it("requires authentication", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    const res = await GET(req("http://localhost/api/jobs"));
    expect(res.status).toBe(401);
  });

  it("forwards search filter to the controller", async () => {
    await GET(req("http://localhost/api/jobs?search=google"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(7, expect.objectContaining({ search: "google" }));
  });

  it("forwards company and location filters", async () => {
    await GET(req("http://localhost/api/jobs?company=acme&location=remote"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(7, expect.objectContaining({ company: "acme", location: "remote" }));
  });

  it("forwards status filter", async () => {
    await GET(req("http://localhost/api/jobs?status=interview"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(7, expect.objectContaining({ status: "interview" }));
  });

  it("forwards date range filters", async () => {
    await GET(req("http://localhost/api/jobs?dateFrom=2026-01-01T00:00:00.000Z&dateTo=2026-02-01T00:00:00.000Z"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ dateFrom: "2026-01-01T00:00:00.000Z", dateTo: "2026-02-01T00:00:00.000Z" }),
    );
  });

  it("forwards ascending sort", async () => {
    await GET(req("http://localhost/api/jobs?sortBy=company&sortOrder=asc"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(7, expect.objectContaining({ sortBy: "company", sortOrder: "asc" }));
  });

  it("forwards descending sort", async () => {
    await GET(req("http://localhost/api/jobs?sortBy=createdAt&sortOrder=desc"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(7, expect.objectContaining({ sortBy: "createdAt", sortOrder: "desc" }));
  });

  it("applies safe defaults for sort and pagination when omitted", async () => {
    await GET(req("http://localhost/api/jobs"));
    expect(mockGetAllJobs).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ sortBy: "createdAt", sortOrder: "desc", page: 1, limit: 20 }),
    );
  });

  it("returns pagination metadata", async () => {
    mockGetAllJobs.mockResolvedValue({ jobs: [{ id: 1 }], total: 45 });
    const res = await GET(req("http://localhost/api/jobs?limit=20&page=2"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.pagination).toMatchObject({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });

  it("rejects an invalid status query parameter", async () => {
    const res = await GET(req("http://localhost/api/jobs?status=pending"));
    expect(res.status).toBe(422);
    expect(mockGetAllJobs).not.toHaveBeenCalled();
  });

  it("rejects an invalid sortBy field (prevents arbitrary fields reaching Prisma)", async () => {
    const res = await GET(req("http://localhost/api/jobs?sortBy=password"));
    expect(res.status).toBe(422);
    expect(mockGetAllJobs).not.toHaveBeenCalled();
  });

  it("rejects a limit above the maximum", async () => {
    const res = await GET(req("http://localhost/api/jobs?limit=10000"));
    expect(res.status).toBe(422);
  });

  it("always derives userId server-side regardless of a client-supplied userId", async () => {
    await GET(req("http://localhost/api/jobs?userId=999&search=x"));
    const [calledUserId] = mockGetAllJobs.mock.calls[0];
    expect(calledUserId).toBe(7);
  });
});
