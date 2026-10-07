import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    job: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    jobTimelineEvent: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { getAnalytics } from "@/controllers/analyticsController";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.jobTimelineEvent.findMany.mockResolvedValue([]);
  prismaMock.job.findMany.mockResolvedValue([]);
});

describe("analyticsController.getAnalytics", () => {
  it("scopes every query to the given userId", async () => {
    prismaMock.job.count.mockResolvedValue(0);
    prismaMock.job.groupBy.mockResolvedValue([]);
    await getAnalytics(7, "all");
    // count where includes userId
    expect(prismaMock.job.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) }));
    for (const call of prismaMock.job.groupBy.mock.calls) {
      expect(call[0].where.userId).toBe(7);
    }
    // recent activity restricted to the user's jobs
    expect(prismaMock.jobTimelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { job: { userId: 7 } } }),
    );
  });

  it("computes total and status breakdown with all canonical statuses present", async () => {
    prismaMock.job.count.mockResolvedValue(35);
    prismaMock.job.groupBy.mockImplementation(({ by }) => {
      if (by[0] === "status") {
        return Promise.resolve([
          { status: "applied", _count: { _all: 20 } },
          { status: "interview", _count: { _all: 5 } },
          { status: "offer", _count: { _all: 2 } },
          { status: "rejected", _count: { _all: 8 } },
        ]);
      }
      if (by[0] === "company") {
        return Promise.resolve([
          { company: "Google", _count: { _all: 10 } },
          { company: "Microsoft", _count: { _all: 5 } },
        ]);
      }
      return Promise.resolve([{ location: "Remote", _count: { _all: 15 } }]);
    });

    const result = await getAnalytics(7, "all");
    expect(result.total).toBe(35);
    expect(result.statusBreakdown).toEqual({ applied: 20, interview: 5, offer: 2, rejected: 8 });
    // rates
    expect(result.rates.interviewRate).toBeCloseTo((5 / 35) * 100, 1);
    expect(result.rates.offerRate).toBeCloseTo((2 / 35) * 100, 1);
    expect(result.rates.rejectionRate).toBeCloseTo((8 / 35) * 100, 1);
    // top companies sorted desc
    expect(result.topCompanies[0]).toEqual({ company: "Google", count: 10 });
    expect(result.locationBreakdown[0]).toEqual({ location: "Remote", count: 15 });
  });

  it("avoids division by zero when the user has no jobs", async () => {
    prismaMock.job.count.mockResolvedValue(0);
    prismaMock.job.groupBy.mockResolvedValue([]);
    const result = await getAnalytics(7, "30d");
    expect(result.total).toBe(0);
    expect(result.rates).toEqual({ interviewRate: 0, offerRate: 0, rejectionRate: 0 });
    expect(result.statusBreakdown).toEqual({ applied: 0, interview: 0, offer: 0, rejected: 0 });
  });

  it("builds a zero-filled 7-day trend for range=7d", async () => {
    prismaMock.job.count.mockResolvedValue(1);
    prismaMock.job.groupBy.mockResolvedValue([]);
    prismaMock.job.findMany.mockResolvedValue([{ createdAt: new Date() }]);
    const result = await getAnalytics(7, "7d");
    expect(result.trend).toHaveLength(7);
    const totalInTrend = result.trend.reduce((s, p) => s + p.count, 0);
    expect(totalInTrend).toBe(1);
  });

  it("applies a createdAt lower bound for fixed ranges but not for 'all'", async () => {
    prismaMock.job.count.mockResolvedValue(0);
    prismaMock.job.groupBy.mockResolvedValue([]);
    await getAnalytics(7, "30d");
    expect(prismaMock.job.count.mock.calls[0][0].where.createdAt).toBeDefined();

    vi.clearAllMocks();
    prismaMock.job.count.mockResolvedValue(0);
    prismaMock.job.groupBy.mockResolvedValue([]);
    prismaMock.job.findMany.mockResolvedValue([]);
    prismaMock.jobTimelineEvent.findMany.mockResolvedValue([]);
    await getAnalytics(7, "all");
    expect(prismaMock.job.count.mock.calls[0][0].where.createdAt).toBeUndefined();
  });
});
