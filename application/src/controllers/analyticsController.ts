// src/controllers/analyticsController.ts
import type { AnalyticsRange } from "@/lib/validation";
import { JOB_STATUSES, type JobStatus } from "@/lib/jobStatus";

const prisma = (await import("@/lib/prisma")).default;

export type StatusBreakdown = Record<JobStatus, number>;

export type AnalyticsResult = {
  range: AnalyticsRange;
  total: number;
  statusBreakdown: StatusBreakdown;
  rates: {
    interviewRate: number;
    offerRate: number;
    rejectionRate: number;
  };
  trend: { date: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  recentActivity: {
    id: number;
    type: string;
    title: string;
    description: string | null;
    createdAt: Date;
  }[];
};

function rangeToStartDate(range: AnalyticsRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Computes analytics for a single user, entirely scoped to their userId.
 * All aggregation is performed in the database (count / groupBy); the full
 * job dataset is never loaded into memory.
 */
export async function getAnalytics(userId: number | string, range: AnalyticsRange): Promise<AnalyticsResult> {
  const uid = typeof userId === "number" ? userId : Number(userId);
  const start = rangeToStartDate(range);

  const where = {
    userId: uid,
    ...(start ? { createdAt: { gte: start } } : {}),
  };

  const [total, byStatus, byCompany, byLocation, trendRows, recent] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.job.groupBy({ by: ["company"], where, _count: { _all: true } }),
    prisma.job.groupBy({ by: ["location"], where, _count: { _all: true } }),
    prisma.job.findMany({ where, select: { createdAt: true } }),
    prisma.jobTimelineEvent.findMany({
      where: { job: { userId: uid } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, type: true, title: true, description: true, createdAt: true },
    }),
  ]);

  // Status breakdown (ensure all canonical statuses are present).
  const statusBreakdown = JOB_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as StatusBreakdown);
  for (const row of byStatus) {
    if ((JOB_STATUSES as readonly string[]).includes(row.status)) {
      statusBreakdown[row.status as JobStatus] = row._count._all;
    }
  }

  const rates = {
    interviewRate: total > 0 ? round1((statusBreakdown.interview / total) * 100) : 0,
    offerRate: total > 0 ? round1((statusBreakdown.offer / total) * 100) : 0,
    rejectionRate: total > 0 ? round1((statusBreakdown.rejected / total) * 100) : 0,
  };

  // Top companies (desc by count, cap at 5).
  const topCompanies = byCompany
    .map((r) => ({ company: r.company, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Location breakdown (desc by count, cap at 10).
  const locationBreakdown = byLocation
    .map((r) => ({ location: r.location, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Trend: bucket job createdAt by day across the selected window.
  const trend = buildTrend(trendRows.map((r) => r.createdAt), range, start);

  return {
    range,
    total,
    statusBreakdown,
    rates,
    trend,
    topCompanies,
    locationBreakdown,
    recentActivity: recent,
  };
}

function toDayKey(d: Date): string {
  // Use local date parts so day bucketing matches the locally-computed
  // range window (rangeToStartDate), avoiding UTC/local off-by-one errors.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTrend(dates: Date[], range: AnalyticsRange, start: Date | null): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = toDayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // For fixed ranges, emit a zero-filled continuous series so charts look right.
  if (start) {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const series: { date: string; count: number }[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < days; i++) {
      const key = toDayKey(cursor);
      series.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return series;
  }

  // "all": just the days that have data, sorted ascending.
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
