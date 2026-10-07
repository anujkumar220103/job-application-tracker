import { Job } from "@/types";
import { JobStatus } from "@/lib/jobStatus";

/**
 * Groups a list of jobs by their status for the Kanban board.
 * Filtering/sorting/pagination are performed server-side; this only arranges
 * the already-fetched page of jobs into status columns for display.
 */
export function groupJobsByStatus(jobs: Job[]): Record<JobStatus, Job[]> {
  const grouped: Record<JobStatus, Job[]> = {
    applied: [],
    interview: [],
    offer: [],
    rejected: [],
  };

  for (const job of jobs) {
    if (job.status in grouped) {
      grouped[job.status].push(job);
    }
  }

  return grouped;
}
