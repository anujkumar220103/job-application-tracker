"use client";

import { useMemo, useState } from "react";
import { Job } from "@/types";
import { getJobStatusLabel, JOB_STATUS_OPTIONS, JobStatus } from "@/lib/jobStatus";
import { groupJobsByStatus } from "@/lib/jobPipeline";

export type BoardFilters = {
  search: string;
  status: "all" | JobStatus;
  company: string;
  location: string;
  dateRange: "all" | "today" | "last7days" | "last30days";
};

export type BoardSort = {
  sortBy: "createdAt" | "company" | "position" | "location" | "status";
  sortOrder: "asc" | "desc";
};

export type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const SORT_PRESETS: { value: string; label: string; sortBy: BoardSort["sortBy"]; sortOrder: BoardSort["sortOrder"] }[] = [
  { value: "createdAt_desc", label: "Newest first", sortBy: "createdAt", sortOrder: "desc" },
  { value: "createdAt_asc", label: "Oldest first", sortBy: "createdAt", sortOrder: "asc" },
  { value: "company_asc", label: "Company A–Z", sortBy: "company", sortOrder: "asc" },
  { value: "company_desc", label: "Company Z–A", sortBy: "company", sortOrder: "desc" },
  { value: "position_asc", label: "Position A–Z", sortBy: "position", sortOrder: "asc" },
  { value: "position_desc", label: "Position Z–A", sortBy: "position", sortOrder: "desc" },
];

interface JobsBoardProps {
  jobs: Job[];
  filters: BoardFilters;
  sort: BoardSort;
  pagination: PaginationState;
  onFilterChange: (field: keyof BoardFilters, value: string) => void;
  onClearFilters: () => void;
  onSortChange: (sort: BoardSort) => void;
  onPageChange: (page: number) => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number) => void;
  onStatusChange?: (id: number, status: JobStatus) => Promise<void> | void;
  onSelect?: (job: Job) => void;
}

export default function JobsBoard({
  jobs,
  filters,
  sort,
  pagination,
  onFilterChange,
  onClearFilters,
  onSortChange,
  onPageChange,
  onDelete,
  onUpdate,
  onStatusChange,
  onSelect,
}: JobsBoardProps) {
  const [draggedJobId, setDraggedJobId] = useState<number | null>(null);

  const groupedJobs = useMemo(() => groupJobsByStatus(jobs), [jobs]);
  const currentSortValue = `${sort.sortBy}_${sort.sortOrder}`;

  const handleDrop = async (status: JobStatus) => {
    if (draggedJobId === null || !onStatusChange) return;
    const id = draggedJobId;
    setDraggedJobId(null);
    await onStatusChange(id, status);
  };

  return (
    <div className="space-y-6">
      <div className="surface p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="block text-sm font-bold text-[var(--muted)]">
            Search
            <input
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="field-input mt-2"
              placeholder="Search jobs"
            />
          </label>
          <label className="block text-sm font-bold text-[var(--muted)]">
            Status
            <select
              value={filters.status}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="field-input mt-2"
            >
              <option value="all">All statuses</option>
              {JOB_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-[var(--muted)]">
            Company
            <input
              value={filters.company}
              onChange={(e) => onFilterChange("company", e.target.value)}
              className="field-input mt-2"
              placeholder="Company"
            />
          </label>
          <label className="block text-sm font-bold text-[var(--muted)]">
            Location
            <input
              value={filters.location}
              onChange={(e) => onFilterChange("location", e.target.value)}
              className="field-input mt-2"
              placeholder="Location"
            />
          </label>
          <label className="block text-sm font-bold text-[var(--muted)]">
            Date range
            <select
              value={filters.dateRange}
              onChange={(e) => onFilterChange("dateRange", e.target.value)}
              className="field-input mt-2"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-[var(--muted)]">
            Sort
            <select
              value={currentSortValue}
              onChange={(e) => {
                const preset = SORT_PRESETS.find((p) => p.value === e.target.value);
                if (preset) onSortChange({ sortBy: preset.sortBy, sortOrder: preset.sortOrder });
              }}
              className="field-input mt-2"
            >
              {SORT_PRESETS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {pagination.total} result{pagination.total === 1 ? "" : "s"}
          </p>
          <button type="button" className="button-secondary" onClick={onClearFilters}>Clear filters</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {(Object.keys(groupedJobs) as JobStatus[]).map((status) => (
          <div
            key={status}
            className="surface min-h-[220px] p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void handleDrop(status)}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">{getJobStatusLabel(status)}</h2>
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-[var(--muted)]">
                {groupedJobs[status].length}
              </span>
            </div>

            <div className="space-y-3">
              {groupedJobs[status].length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  No applications
                </div>
              ) : (
                groupedJobs[status].map((job) => (
                  <div
                    key={job.id}
                    className="cursor-grab rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 shadow-sm active:cursor-grabbing"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedJobId(job.id);
                    }}
                    onDragEnd={() => setDraggedJobId(null)}
                  >
                    <p className="font-bold text-[var(--foreground)] break-words">{job.position}</p>
                    <p className="mt-1 text-sm text-[var(--muted)] break-words">{job.company}</p>
                    <p className="mt-2 text-xs text-[var(--muted)] break-words">{job.location}</p>
                    {job.link && (
                      <a href={job.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-[var(--brand)] hover:underline">
                        View
                      </a>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {onUpdate && (
                        <button type="button" className="button-secondary min-h-8 shrink-0 px-2 text-[11px]" onClick={() => onUpdate(job.id)}>
                          Edit
                        </button>
                      )}
                      {onSelect && (
                        <button type="button" className="button-secondary min-h-8 shrink-0 px-2 text-[11px]" onClick={() => onSelect(job)}>
                          Details
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" className="button-danger min-h-8 shrink-0 px-2 text-[11px]" onClick={() => onDelete(job.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="button-secondary min-h-9 px-3 text-sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="button-secondary min-h-9 px-3 text-sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
