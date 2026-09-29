"use client";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";
import Link from "next/link";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
    setLoading(true);
    setMessage("");
    setError("");
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Unable to add this application.");
      setMessage("Application added successfully.");
      setForm({ company: "", position: "", location: "", status: "applied", link: "" });
    } catch (err) {
      console.error("Error adding job:", err);
      setError(err instanceof Error ? err.message : "Failed to add application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8"><p className="eyebrow">New opportunity</p><h1 className="page-title mt-2">Add an application</h1><p className="page-copy">Capture the essentials now so you can keep moving.</p></div>
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
