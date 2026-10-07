import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetAnalytics } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetAnalytics: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUserFromRequest: mockGetUser }));
vi.mock("@/controllers/analyticsController", () => ({ getAnalytics: mockGetAnalytics }));

import { GET } from "@/app/api/analytics/route";

function req(url: string, auth = true) {
  return new Request(url, auth ? { headers: { Authorization: "Bearer t" } } : {});
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnalytics.mockResolvedValue({ total: 0 });
});

describe("GET /api/analytics (Phase 4)", () => {
  it("requires authentication", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await GET(req("http://x/api/analytics", false));
    expect(res.status).toBe(401);
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it("scopes analytics to the authenticated user (never a client userId)", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    await GET(req("http://x/api/analytics?userId=999"));
    const [calledUserId] = mockGetAnalytics.mock.calls[0];
    expect(calledUserId).toBe(7);
  });

  it("defaults the range to 30d when omitted", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    await GET(req("http://x/api/analytics"));
    expect(mockGetAnalytics).toHaveBeenCalledWith(7, "30d");
  });

  it("passes a valid range through", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    await GET(req("http://x/api/analytics?range=90d"));
    expect(mockGetAnalytics).toHaveBeenCalledWith(7, "90d");
  });

  it("rejects an invalid range with 422", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    const res = await GET(req("http://x/api/analytics?range=all-time"));
    expect(res.status).toBe(422);
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it("returns the analytics payload in the standard envelope", async () => {
    mockGetUser.mockResolvedValue({ id: 7 });
    mockGetAnalytics.mockResolvedValue({ total: 3, range: "30d" });
    const res = await GET(req("http://x/api/analytics"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ total: 3 });
  });
});
