// File: components/JobCard.tsx
"use client";

import React from "react";
import { Job } from "@/types";

interface JobCardProps {
  job: Job;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number) => void;
}

export default function JobCard({ job, onDelete, onUpdate }: JobCardProps) {

  console.log("JobCard render:", job);

  // defensive values
  const position = job.position ?? "Untitled role";
  const company = job.company ?? "Unknown company";
  const location = job.location ?? "Unknown location";
  const statusRaw = job.status ?? "unknown";
  const statusUpper = String(statusRaw).toUpperCase();

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg text-gray-800">{position}</h3>
        <p className="text-gray-600">{company}</p>
        <p className="text-sm text-gray-500">{location}</p>

        <p
          className={`text-sm mt-2 font-medium ${
            statusRaw === "applied"
              ? "text-blue-600"
              : statusRaw === "interview"
              ? "text-yellow-600"
              : statusRaw === "offer"
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {statusUpper}
        </p>

        {job.link && (
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 text-sm mt-2 inline-block"
          >
            View Application ↗
          </a>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {onUpdate && (
          <button
            onClick={() => onUpdate(job.id)}
            className="px-3 py-1.5 text-sm font-semibold bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors cursor-pointer"
            type="button"
          >
            Update
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(job.id)}
            className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
            type="button"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
