"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";

export type TimelineItem = {
  id: number;
  jobId: number;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

// Turns a metadata key into a human-readable label, e.g.
// "status" -> "Status", "previousStatus" -> "Previous status".
function formatMetadataLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Renders a metadata value as plain, readable text (no JSON/braces/quotes).
function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatMetadataLabel(k)}: ${formatMetadataValue(v)}`)
      .join(", ");
  }
  return String(value);
}

export default function JobTimeline({ jobId }: { jobId: number }) {
  const { token } = useAuth();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await apiRequest<TimelineItem[]>(`/jobs/${jobId}/timeline`, { token });
        setItems(data);
        setError(null);
      } catch (err) {
        setError(errorMessage(err, "Unable to load timeline"));
      } finally {
        setLoading(false);
      }
    };

    void fetchTimeline();
  }, [jobId, token]);

  if (!token) {
    return <div className="surface p-4 text-sm text-[var(--muted)]">Sign in to view the timeline.</div>;
  }
  if (loading) {
    return <div className="surface p-4 text-sm text-[var(--muted)]">Loading timeline…</div>;
  }
  if (error) {
    return <div className="surface p-4 text-sm text-[var(--danger)]">{error}</div>;
  }
  if (items.length === 0) {
    return <div className="surface p-4 text-sm text-[var(--muted)]">No timeline activity yet.</div>;
  }

  return (
    <div className="surface p-4">
      <h3 className="mb-4 text-lg font-bold">Timeline</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                {item.type}
              </span>
              <span className="text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 font-bold">{item.title}</p>
            {item.description && <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <p key={key} className="text-sm text-[var(--muted)]">
                    <span className="font-semibold text-[var(--foreground)]">{formatMetadataLabel(key)}:</span>{" "}
                    {formatMetadataValue(value)}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
