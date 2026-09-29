"use client";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      // ✅ Save token to localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", data.name);
      // ✅ Redirect to dashboard
    //   router.push("/dashboard");
    window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-md">
      <div className="mb-8"><p className="eyebrow">Welcome back</p><h1 className="page-title mt-2">Sign in</h1><p className="page-copy">Pick up your application search where you left off.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void handleLogin(); }} className="surface grid gap-5 p-6 sm:p-8">
        {error && <p className="rounded-md bg-[#fff1ef] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</p>}
        <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field-input" required /></div>
        <div><label className="field-label" htmlFor="password">Password</label><input id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="field-input" required /></div>
        <button type="submit" disabled={loading} className="button-primary w-full">{loading ? "Signing in..." : "Sign in"}</button>
        <p className="text-center text-sm text-[var(--muted)]">New here? <Link href="/signup" className="font-bold text-[var(--brand)]">Create an account</Link></p>
      </form>
    </section>
  );
}
