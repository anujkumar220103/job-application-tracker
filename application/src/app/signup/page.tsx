"use client";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({ email: "", password: "" ,name:""});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Signup failed");
      }
      
    window.location.href = "/login";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-md">
      <div className="mb-8"><p className="eyebrow">Start organized</p><h1 className="page-title mt-2">Create your account</h1><p className="page-copy">A calmer way to keep track of every opportunity.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void handleSignup(); }} className="surface grid gap-5 p-6 sm:p-8">
        {error && <p className="rounded-md bg-[#fff1ef] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</p>}
        <div><label className="field-label" htmlFor="name">Name</label><input id="name" type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field-input" required /></div>
        <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field-input" required /></div>
        <div><label className="field-label" htmlFor="password">Password</label><input id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="field-input" required /></div>
        <button type="submit" disabled={loading} className="button-primary w-full">{loading ? "Creating account..." : "Create account"}</button>
        <p className="text-center text-sm text-[var(--muted)]">Already have an account? <Link href="/login" className="font-bold text-[var(--brand)]">Sign in</Link></p>
      </form>
    </section>
  );
}
