import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetJobById, mockGetJobTimeline } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetJobById: vi.fn(),
  mockGetJobTimeline: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUserFromRequest: mockGetUser }));
vi.mock("@/controllers/jobController", () => ({ getJobById: mockGetJobById }));
vi.mock("@/lib/timeline", () => ({ getJobTimeline: mockGetJobTimeline }));

import { GET } from "@/app/api/jobs/[id]/timeline/route";

function authReq() {
  return new Request("http://x/api/jobs/10/timeline", { headers: { Authorization: "Bearer t" } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET job timeline (Phase 3)", () => {
  it("requires authentication", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await GET(authReq(), { params: { id: "10" } });
    expect(res.status).toBe(401);
  });

  it("requires ownership", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    mockGetJobById.mockResolvedValue({ id: 10, userId: 99 });
    const res = await GET(authReq(), { params: { id: "10" } });
    expect(res.status).toBe(403);
  });

  it("returns timeline items for the owner", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    mockGetJobById.mockResolvedValue({ id: 10, userId: 7 });
    mockGetJobTimeline.mockResolvedValue([{ id: 1, type: "created" }]);
    const res = await GET(authReq(), { params: { id: "10" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data[0]).toMatchObject({ type: "created" });
  });
});
