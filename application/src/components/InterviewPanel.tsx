"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import ConfirmDialog from "@/components/ConfirmDialog";

export type InterviewRecord = {
  id: number;
  jobId: number;
  title: string;
  type?: string | null;
  dateTime: string;
  interviewer?: string | null;
  meetingLink?: string | null;
  location?: string | null;
  notes?: string | null;
  status: "scheduled" | "completed" | "cancelled";
};

const EMPTY_FORM = {
  title: "",
  type: "phone",
  dateTime: "",
  interviewer: "",
  meetingLink: "",
  location: "",
  notes: "",
};

export default function InterviewPanel({ jobId }: { jobId: number }) {
  const { token } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<InterviewRecord[]>(`/jobs/${jobId}/interviews`, { token });
      setItems(data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Unable to fetch interviews"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiRequest(`/jobs/${jobId}/interviews`, { method: "POST", token, body: form });
      setForm(EMPTY_FORM);
      toast.success("Interview scheduled.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create interview"));
    }
  };

  const updateStatus = async (id: number, status: "scheduled" | "completed" | "cancelled") => {
    if (!token) return;
    try {
      await apiRequest(`/interviews/${id}`, { method: "PUT", token, body: { status } });
      toast.success(`Interview ${status}.`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to update interview"));
    }
  };

  const confirmRemove = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (id === null || !token) return;
    try {
      await apiRequest(`/interviews/${id}`, { method: "DELETE", token });
      toast.success("Interview deleted.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to delete interview"));
    }
  };

  if (!token) return <div className="surface p-4 text-sm text-[var(--muted)]">Sign in to manage interviews.</div>;
  if (loading) return <div className="surface p-4 text-sm text-[var(--muted)]">Loading interviews…</div>;

  return (
    <div className="space-y-4">
      <div className="surface p-4">
        <h3 className="mb-4 text-lg font-bold">Interviews</h3>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
          <label className="sr-only" htmlFor="interview-title">Title</label>
          <input id="interview-title" className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" required />
          <label className="sr-only" htmlFor="interview-type">Type</label>
          <select id="interview-type" className="field-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="phone">Phone</option>
            <option value="video">Video</option>
            <option value="onsite">Onsite</option>
            <option value="panel">Panel</option>
            <option value="other">Other</option>
          </select>
          <label className="sr-only" htmlFor="interview-datetime">Date and time</label>
          <input id="interview-datetime" className="field-input" type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} required />
          <label className="sr-only" htmlFor="interview-interviewer">Interviewer</label>
          <input id="interview-interviewer" className="field-input" value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} placeholder="Interviewer" />
          <label className="sr-only" htmlFor="interview-link">Meeting link</label>
          <input id="interview-link" className="field-input md:col-span-2" value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} placeholder="Meeting link" />
          <label className="sr-only" htmlFor="interview-location">Location</label>
          <input id="interview-location" className="field-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" />
          <label className="sr-only" htmlFor="interview-notes">Notes</label>
          <textarea id="interview-notes" className="field-input md:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} />
          <button type="submit" className="button-primary md:col-span-2">Add interview</button>
        </form>
      </div>

      {error && <div className="surface p-4 text-sm text-[var(--danger)]">{error}</div>}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="surface p-4 text-sm text-[var(--muted)]">No interviews yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="text-sm text-[var(--muted)]">{item.type || "Other"} · {item.status}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="button-secondary min-h-8 px-2 text-xs" onClick={() => updateStatus(item.id, "completed")} disabled={item.status === "completed"}>Complete</button>
                <button type="button" className="button-secondary min-h-8 px-2 text-xs" onClick={() => updateStatus(item.id, "cancelled")} disabled={item.status === "cancelled"}>Cancel</button>
                <button type="button" className="button-danger min-h-8 px-2 text-xs" onClick={() => setPendingDeleteId(item.id)}>Delete</button>
              </div>
            </div>
            <div className="mt-3 text-sm text-[var(--muted)] space-y-1">
              <p>When: {new Date(item.dateTime).toLocaleString()}</p>
              {item.interviewer && <p>Interviewer: {item.interviewer}</p>}
              {item.meetingLink && <a className="text-[var(--brand)] underline" href={item.meetingLink} target="_blank" rel="noreferrer">Meeting link</a>}
              {item.location && <p>Location: {item.location}</p>}
              {item.notes && <p>Notes: {item.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete interview?"
        message="This permanently removes the interview."
        confirmLabel="Delete"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
