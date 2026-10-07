"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import UpdateJobModal from "@/components/UpdateJobModal";
import JobsBoard, { type BoardFilters, type BoardSort, type PaginationState } from "@/components/JobsBoard";
import ConfirmDialog from "@/components/ConfirmDialog";
import JobTimeline from "@/components/JobTimeline";
import InterviewPanel from "@/components/InterviewPanel";
import ReminderPanel from "@/components/ReminderPanel";
import { Job } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import type { JobStatus } from "@/lib/jobStatus";

const EMPTY_FILTERS: BoardFilters = {
  search: "",
  status: "all",
  company: "",
  location: "",
  dateRange: "all",
};

const DEFAULT_SORT: BoardSort = { sortBy: "createdAt", sortOrder: "desc" };
const PAGE_LIMIT = 20;

function dateRangeToFrom(range: BoardFilters["dateRange"]): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  const d = new Date(now);
  if (range === "today") d.setHours(0, 0, 0, 0);
  else if (range === "last7days") d.setDate(now.getDate() - 7);
  else if (range === "last30days") d.setDate(now.getDate() - 30);
  return d.toISOString();
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<BoardSort>(DEFAULT_SORT);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Debounce text inputs that hit the server.
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [debouncedCompany, setDebouncedCompany] = useState(filters.company);
  const [debouncedLocation, setDebouncedLocation] = useState(filters.location);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setDebouncedCompany(filters.company);
      setDebouncedLocation(filters.location);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters.search, filters.company, filters.location]);

  const buildQuery = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (debouncedCompany.trim()) params.set("company", debouncedCompany.trim());
      if (debouncedLocation.trim()) params.set("location", debouncedLocation.trim());
      if (filters.status !== "all") params.set("status", filters.status);
      const dateFrom = dateRangeToFrom(filters.dateRange);
      if (dateFrom) params.set("dateFrom", dateFrom);
      params.set("sortBy", sort.sortBy);
      params.set("sortOrder", sort.sortOrder);
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      return params.toString();
    },
    [debouncedSearch, debouncedCompany, debouncedLocation, filters.status, filters.dateRange, sort],
  );

  const fetchJobs = useCallback(
    async (page: number) => {
      if (!isAuthenticated || !token) {
        setError("Please sign in to view your applications.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const query = buildQuery(page);
        const { data, meta } = await apiRequest<Job[]>(`/jobs?${query}`, { token });
        setJobs(data);
        const paginationMeta = (meta?.pagination as PaginationState | undefined) ?? {
          page,
          limit: PAGE_LIMIT,
          total: data.length,
          totalPages: 1,
        };
        setPagination(paginationMeta);
        setSelectedJob((current) => {
          if (current && data.some((job) => job.id === current.id)) return current;
          return data.length > 0 ? data[0] : null;
        });
        setError("");
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError(errorMessage(err, "We couldn't load your applications. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, token, buildQuery],
  );

  // Refetch whenever query inputs change (resets to page 1).
  useEffect(() => {
    void fetchJobs(1);
  }, [fetchJobs]);

  const handleFilterChange = (field: keyof BoardFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSort(DEFAULT_SORT);
  };

  const requestDelete = (id: number) => setPendingDeleteId(id);

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (id === null || !token) return;
    try {
      await apiRequest(`/jobs/${id}`, { method: "DELETE", token });
      setJobs((prev) => prev.filter((job) => job.id !== id));
      toast.success("Application deleted.");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete application."));
    }
  };

  const handleUpdate = (id: number) => {
    const jobToEdit = jobs.find((j) => j.id === id);
    if (jobToEdit) setEditingJob(jobToEdit);
  };

  const handleSaveUpdate = async (updatedData: Partial<Job>) => {
    if (!editingJob || !token) return;
    try {
      const { data } = await apiRequest<Job>(`/jobs/${editingJob.id}`, {
        method: "PUT",
        token,
        body: updatedData,
      });
      setJobs((prev) => prev.map((job) => (job.id === editingJob.id ? { ...job, ...data } : job)));
      setEditingJob(null);
      toast.success("Application updated.");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update application."));
    }
  };

  // Optimistic Kanban status change: move the card immediately, revert on failure.
  const handleStatusChange = async (id: number, nextStatus: JobStatus) => {
    if (!token) return;
    const previous = jobs;
    const target = jobs.find((j) => j.id === id);
    if (!target || target.status === nextStatus) return;

    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, status: nextStatus } : job)));

    try {
      await apiRequest(`/jobs/${id}`, { method: "PUT", token, body: { status: nextStatus } });
    } catch (err) {
      setJobs(previous); // revert
      toast.error(errorMessage(err, "Unable to update job status."));
    }
  };

  return (
    <section>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Application workspace</p>
          <h1 className="page-title mt-2">Your applications</h1>
          <p className="page-copy">Keep the details and next step for every opportunity in one place.</p>
        </div>
        <Link href="/add-job" className="button-primary">Add application</Link>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="surface p-5"><div className="skeleton h-5 w-1/2" /><div className="skeleton mt-3 h-4 w-1/3" /><div className="skeleton mt-3 h-3 w-1/4" /></div>)}</div>
      ) : error ? (
        <div className="surface p-8"><p className="font-bold text-[var(--foreground)]">Unable to load applications</p><p className="mt-2 text-sm text-[var(--muted)]">{error}</p></div>
      ) : (
        <JobsBoard
          jobs={jobs}
          filters={filters}
          sort={sort}
          pagination={pagination}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onSortChange={setSort}
          onPageChange={(page) => void fetchJobs(page)}
          onDelete={requestDelete}
          onUpdate={handleUpdate}
          onStatusChange={handleStatusChange}
          onSelect={setSelectedJob}
        />
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="surface mt-6 p-10 text-center"><p className="font-bold text-[var(--foreground)]">No applications match</p><p className="page-copy">Try clearing filters, or add your first application.</p><Link href="/add-job" className="button-primary mt-6">Add application</Link></div>
      )}

      {selectedJob && (
        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className="surface p-4">
            <p className="eyebrow">Selected application</p>
            <h2 className="mt-2 text-2xl font-bold">{selectedJob.company}</h2>
            <p className="text-sm text-[var(--muted)]">{selectedJob.position} · {selectedJob.location}</p>
          </div>
          <div className="xl:col-span-3 grid gap-6 xl:grid-cols-3">
            <JobTimeline jobId={selectedJob.id} />
            <InterviewPanel jobId={selectedJob.id} />
            <ReminderPanel jobId={selectedJob.id} />
          </div>
        </div>
      )}

      {editingJob && (
        <UpdateJobModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onUpdate={handleSaveUpdate}
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete application?"
        message="This permanently removes the application and its timeline, interviews, and reminders."
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </section>
  );
}
