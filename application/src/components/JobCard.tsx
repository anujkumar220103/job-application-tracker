"use client";

import React from "react";
import { Job } from "@/types";

interface JobCardProps {
  job: Job;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number) => void;
}

export default function JobCard({ job, onDelete, onUpdate }: JobCardProps) {
  const position = job.position ?? "Untitled role";
  const company = job.company ?? "Unknown company";
  const location = job.location ?? "Unknown location";
  const statusRaw = job.status ?? "unknown";
  const statusLabel = String(statusRaw).charAt(0).toUpperCase() + String(statusRaw).slice(1);
  const statusClass = `status-${String(statusRaw).toLowerCase()}`;

  return (
    <article className="surface flex flex-col justify-between gap-6 p-5 transition-colors hover:border-[#b7c9c9] sm:flex-row sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="truncate text-lg font-bold text-[var(--foreground)]">{position}</h3>
          <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
        </div>
        <p className="mt-1 font-medium text-[#46545d]">{company}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{location || "Location not provided"}</p>
        {job.link && <a href={job.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[var(--brand)] hover:underline">View application <span aria-hidden="true">↗</span></a>}
      </div>
      <div className="flex shrink-0 gap-2">
        {onUpdate && (
          <button onClick={() => onUpdate(job.id)} className="button-secondary min-h-9 px-3 text-sm" type="button">
            Edit
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(job.id)} className="button-danger min-h-9 px-3 text-sm" type="button">
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
