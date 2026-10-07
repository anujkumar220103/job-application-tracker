import type { JobStatus } from "@/lib/jobStatus";

export interface Job {
  id: number;
  company: string;
  position: string;
  location: string;
  status: JobStatus;
  link: string;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}
