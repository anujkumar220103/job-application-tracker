export const JOB_STATUSES = ["applied", "interview", "offer", "rejected"] as const;
export const VALID_JOB_STATUSES = JOB_STATUSES;
export const JOB_STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function normalizeJobStatus(value: unknown): JobStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isValidJobStatus(normalized) ? normalized : null;
}

export function isValidJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && JOB_STATUSES.includes(value as JobStatus);
}

export function getJobStatusLabel(value: unknown): string {
  if (typeof value !== "string") return "Unknown";
  const normalized = normalizeJobStatus(value);
  return normalized ? JOB_STATUS_LABELS[normalized] : "Unknown";
}
