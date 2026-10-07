"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from "@/lib/jobStatus";

type Analytics = {
  range: string;
  total: number;
  statusBreakdown: Record<JobStatus, number>;
  rates: { interviewRate: number; offerRate: number; rejectionRate: number };
  trend: { date: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  recentActivity: { id: number; type: string; title: string; description: string | null; createdAt: string }[];
};

const RANGES: { value: string; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function formatEventType(type: string): string {
  return type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AnalyticsDashboard() {
  const { token, isAuthenticated } = useAuth();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<Analytics>(`/analytics?range=${range}`, { token });
      setData(res.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "We couldn't load your analytics."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTrend = data ? Math.max(1, ...data.trend.map((d) => d.count)) : 1;
  const maxCompany = data ? Math.max(1, ...data.topCompanies.map((c) => c.count)) : 1;

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Insights</p>
          <h2 className="page-title mt-2 text-2xl">Analytics</h2>
        </div>
        <label className="text-sm font-bold text-[var(--muted)]">
          <span className="sr-only">Time range</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="field-input mt-0"
            aria-label="Analytics time range"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface h-28 p-5"><div className="skeleton h-3 w-1/2" /><div className="skeleton mt-5 h-7 w-1/3" /></div>
          ))}
        </div>
      ) : error ? (
        <div className="surface p-6">
          <p className="font-bold text-[var(--foreground)]">Unable to load analytics</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{error}</p>
          <button type="button" className="button-secondary mt-4" onClick={() => void load()}>Try again</button>
        </div>
      ) : !data || data.total === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-bold text-[var(--foreground)]">No data for this period</p>
          <p className="page-copy">Add applications or widen the time range to see insights.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface border-l-4 border-l-[var(--brand)] p-5">
              <p className="text-sm font-bold text-[var(--muted)]">Total applications</p>
              <p className="mt-3 text-3xl font-bold">{data.total}</p>
            </div>
            <div className="surface p-5">
              <p className="text-sm font-bold text-[var(--muted)]">Interview rate</p>
              <p className="mt-3 text-3xl font-bold">{data.rates.interviewRate}%</p>
            </div>
            <div className="surface p-5">
              <p className="text-sm font-bold text-[var(--muted)]">Offer rate</p>
              <p className="mt-3 text-3xl font-bold">{data.rates.offerRate}%</p>
            </div>
            <div className="surface p-5">
              <p className="text-sm font-bold text-[var(--muted)]">Rejection rate</p>
              <p className="mt-3 text-3xl font-bold">{data.rates.rejectionRate}%</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="surface p-6">
            <h3 className="font-bold">Application status</h3>
            <div className="mt-4 space-y-3">
              {JOB_STATUSES.map((status) => {
                const count = data.statusBreakdown[status] ?? 0;
                const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{JOB_STATUS_LABELS[status]}</span>
                      <span className="text-[var(--muted)]">{count} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div className={`h-full rounded-full status-bar-${status}`} style={{ width: `${pct}%`, backgroundColor: "var(--brand)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend */}
          <div className="surface p-6">
            <h3 className="font-bold">Application trend</h3>
            {data.trend.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No applications in this period.</p>
            ) : (
              <div className="mt-4 flex h-32 items-end gap-[2px]" role="img" aria-label="Applications over time">
                {data.trend.map((point) => (
                  <div key={point.date} className="group relative flex-1" title={`${point.date}: ${point.count}`}>
                    <div
                      className="w-full rounded-t bg-[var(--brand)]"
                      style={{ height: `${Math.max(2, (point.count / maxTrend) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top companies */}
            <div className="surface p-6">
              <h3 className="font-bold">Top companies</h3>
              {data.topCompanies.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">No companies yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.topCompanies.map((c) => (
                    <div key={c.company}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold break-words">{c.company}</span>
                        <span className="text-[var(--muted)]">{c.count}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(c.count / maxCompany) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Locations */}
            <div className="surface p-6">
              <h3 className="font-bold">Locations</h3>
              {data.locationBreakdown.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">No locations yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--border)]">
                  {data.locationBreakdown.map((l) => (
                    <li key={l.location} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold break-words">{l.location}</span>
                      <span className="text-[var(--muted)]">{l.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="surface p-6">
            <h3 className="font-bold">Recent activity</h3>
            {data.recentActivity.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No recent activity.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{a.title}</p>
                      {a.description && <p className="text-xs text-[var(--muted)] break-words">{a.description}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      {formatEventType(a.type)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
