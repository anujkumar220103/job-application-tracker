"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Job } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import { JOB_STATUS_LABELS } from "@/lib/jobStatus";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchJobs = async () => {
      if (!isAuthenticated || !token) {
        setError("Please sign in to view your dashboard.");
        setLoading(false);
        return;
      }

      try {
        // Pull a larger page for dashboard counts.
        const { data } = await apiRequest<Job[]>(`/jobs?limit=100`, { token });
        setJobs(data);
        setError("");
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setJobs([]);
        setError(errorMessage(err, "We couldn't load your dashboard data."));
      } finally {
        setLoading(false);
      }
    };

    void fetchJobs();
  }, [isAuthenticated, token]);

  const total = jobs.length;
  const counts = {
    applied: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "applied").length,
    interview: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "interview").length,
    offer: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "offer").length,
    rejected: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "rejected").length,
  };

  return (
    <section>
      <div className="mb-8"><p className="eyebrow">Overview</p><h1 className="page-title mt-2">Your dashboard</h1><p className="page-copy">A clear read on the opportunities you are moving forward.</p></div>
      {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="surface h-28 p-5"><div className="skeleton h-3 w-1/2" /><div className="skeleton mt-5 h-7 w-1/3" /></div>)}</div> : error ? <div className="surface p-8"><p className="font-bold">Unable to load dashboard</p><p className="page-copy">{error}</p></div> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface border-l-4 border-l-[var(--brand)] p-5"><p className="text-sm font-bold text-[var(--muted)]">Total applications</p><p className="mt-3 text-3xl font-bold">{total}</p></div>
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="surface p-5">
            <h2 className="text-sm font-bold capitalize text-[var(--muted)]">{JOB_STATUS_LABELS[key as keyof typeof JOB_STATUS_LABELS] ?? key}</h2>
            <p className="mt-3 text-3xl font-bold text-[var(--foreground)]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Recent applications</h2><Link href="/jobs" className="text-sm font-bold text-[var(--brand)]">View all</Link></div>{jobs.length ? <div className="mt-5 divide-y divide-[var(--border)]">{jobs.slice(0, 4).map((job) => <div key={job.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-bold">{job.position}</p><p className="mt-1 text-sm text-[var(--muted)]">{job.company}</p></div><span className={`status-badge status-${job.status}`}>{JOB_STATUS_LABELS[job.status]}</span></div>)}</div> : <div className="py-8 text-center"><p className="font-bold">No applications yet</p><Link href="/add-job" className="button-primary mt-5">Add application</Link></div>}</div>
        <div className="surface bg-[var(--surface-muted)] p-6"><p className="eyebrow">Next step</p><h2 className="mt-3 text-xl font-bold">Keep your pipeline current.</h2><p className="page-copy">Update a status after every conversation so your overview stays useful.</p><Link href="/jobs" className="button-secondary mt-6">Review applications</Link></div>
      </div></>}
      {!error && <AnalyticsDashboard />}
    </section>
  );
}
