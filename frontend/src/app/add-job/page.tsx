"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, errorMessage, ApiError } from "@/lib/apiClient";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/jobStatus";

type DuplicateInfo = {
  existingJobId: number;
  company: string;
  position: string;
  status: string;
};

export default function AddJobPage() {
  const [form, setForm] = useState({
    company: "",
    position: "",
    location: "",
    status: "applied",
    link: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const { token, isAuthenticated } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!isAuthenticated || !token) {
        throw new Error("Please sign in to add an application.");
      }

      setLoading(true);
      setMessage("");
      setError("");
      setDuplicate(null);

      await apiRequest(`/jobs`, { method: "POST", token, body: form });

      setMessage("Application added successfully.");
      setForm({ company: "", position: "", location: "", status: "applied", link: "" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_APPLICATION") {
        const d = err.details as DuplicateInfo | undefined;
        if (d?.existingJobId) {
          setDuplicate(d);
          return;
        }
      }
      console.error("Error adding job:", err);
      setError(errorMessage(err, "Failed to add application."));
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = duplicate ? (JOB_STATUS_LABELS[duplicate.status as JobStatus] ?? duplicate.status) : "";

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8"><p className="eyebrow">New opportunity</p><h1 className="page-title mt-2">Add an application</h1><p className="page-copy">Capture the essentials now so you can keep moving.</p></div>

      {duplicate && (
        <div className="surface mb-6 border-l-4 border-l-[var(--danger)] p-5" role="alert">
          <p className="font-bold text-[var(--foreground)]">Possible duplicate application</p>
          <p className="mt-1 text-sm text-[var(--muted)]">You already have a similar application:</p>
          <div className="mt-3 text-sm">
            <p><span className="font-semibold">Company:</span> {duplicate.company}</p>
            <p><span className="font-semibold">Position:</span> {duplicate.position}</p>
            <p><span className="font-semibold">Status:</span> {statusLabel}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/jobs" className="button-primary">View existing application</Link>
            <button type="button" className="button-secondary" onClick={() => setDuplicate(null)}>Cancel</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface grid gap-5 p-6 sm:p-8">
        {message && <p className="rounded-md bg-[var(--brand-soft)] px-4 py-3 text-sm font-bold text-[var(--brand-dark)]">{message}</p>}
        {error && <p className="rounded-md bg-[#fff1ef] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</p>}
        <div><label className="field-label" htmlFor="company">Company</label><input id="company" type="text" name="company" value={form.company} onChange={handleChange} className="field-input" required /></div>
        <div><label className="field-label" htmlFor="position">Position</label><input id="position" type="text" name="position" value={form.position} onChange={handleChange} className="field-input" required /></div>
        <div><label className="field-label" htmlFor="location">Location</label><input id="location" type="text" name="location" value={form.location} onChange={handleChange} className="field-input" required /></div>
        <div><label className="field-label" htmlFor="status">Status</label><select id="status" name="status" value={form.status} onChange={handleChange} className="field-input"><option value="applied">Applied</option><option value="interview">Interview</option><option value="offer">Offer</option><option value="rejected">Rejected</option></select></div>
        <div><label className="field-label" htmlFor="link">Application link <span className="font-normal text-[var(--muted)]">(optional)</span></label><input id="link" type="url" name="link" value={form.link} onChange={handleChange} className="field-input" /></div>
        <div className="flex flex-wrap gap-3 pt-2"><button type="submit" className="button-primary" disabled={loading}>{loading ? "Adding..." : "Add application"}</button><Link href="/jobs" className="button-secondary">Cancel</Link></div>
      </form>
    </section>
  );
}
