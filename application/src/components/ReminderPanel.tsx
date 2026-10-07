"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import ConfirmDialog from "@/components/ConfirmDialog";

export type ReminderRecord = {
  id: number;
  jobId: number;
  title: string;
  message?: string;
  notes?: string | null;
  remindAt: string;
  dueAt?: string;
  completed: boolean;
  isSent?: boolean;
};

const EMPTY_FORM = { title: "", notes: "", remindAt: "" };

export default function ReminderPanel({ jobId }: { jobId: number }) {
  const { token } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<ReminderRecord[]>(`/jobs/${jobId}/reminders`, { token });
      setItems(
        data.map((item) => ({
          id: item.id,
          jobId: item.jobId,
          title: item.title || item.message || "",
          notes: item.notes ?? null,
          remindAt: item.remindAt || item.dueAt || "",
          completed: Boolean(item.completed ?? item.isSent),
        })),
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Unable to fetch reminders"));
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
      await apiRequest(`/jobs/${jobId}/reminders`, {
        method: "POST",
        token,
        body: { title: form.title, notes: form.notes, remindAt: form.remindAt },
      });
      setForm(EMPTY_FORM);
      toast.success("Reminder created.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create reminder"));
    }
  };

  const toggleComplete = async (id: number, completed: boolean) => {
    if (!token) return;
    try {
      await apiRequest(`/reminders/${id}`, { method: "PUT", token, body: { completed } });
      toast.success(completed ? "Reminder completed." : "Reminder reopened.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to update reminder"));
    }
  };

  const confirmRemove = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (id === null || !token) return;
    try {
      await apiRequest(`/reminders/${id}`, { method: "DELETE", token });
      toast.success("Reminder deleted.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to delete reminder"));
    }
  };

  if (!token) return <div className="surface p-4 text-sm text-[var(--muted)]">Sign in to manage reminders.</div>;
  if (loading) return <div className="surface p-4 text-sm text-[var(--muted)]">Loading reminders…</div>;

  return (
    <div className="space-y-4">
      <div className="surface p-4">
        <h3 className="mb-4 text-lg font-bold">Reminders</h3>
        <form onSubmit={handleCreate} className="grid gap-3">
          <label className="sr-only" htmlFor="reminder-title">Title</label>
          <input id="reminder-title" className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" required />
          <label className="sr-only" htmlFor="reminder-remindat">Remind at</label>
          <input id="reminder-remindat" className="field-input" type="datetime-local" value={form.remindAt} onChange={(e) => setForm({ ...form, remindAt: e.target.value })} required />
          <label className="sr-only" htmlFor="reminder-notes">Notes</label>
          <textarea id="reminder-notes" className="field-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} />
          <button type="submit" className="button-primary">Add reminder</button>
        </form>
      </div>

      {error && <div className="surface p-4 text-sm text-[var(--danger)]">{error}</div>}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="surface p-4 text-sm text-[var(--muted)]">No reminders yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="text-sm text-[var(--muted)]">{item.completed ? "Completed" : "Pending"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="button-secondary min-h-8 px-2 text-xs" onClick={() => toggleComplete(item.id, !item.completed)}>{item.completed ? "Reopen" : "Complete"}</button>
                <button type="button" className="button-danger min-h-8 px-2 text-xs" onClick={() => setPendingDeleteId(item.id)}>Delete</button>
              </div>
            </div>
            <div className="mt-3 text-sm text-[var(--muted)] space-y-1">
              <p>Remind at: {item.remindAt ? new Date(item.remindAt).toLocaleString() : "—"}</p>
              <p>Notes: {item.notes || "No notes"}</p>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete reminder?"
        message="This permanently removes the reminder."
        confirmLabel="Delete"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
