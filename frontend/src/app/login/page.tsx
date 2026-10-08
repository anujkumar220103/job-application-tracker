"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import {
  validateEmail,
  validateLoginPassword,
  hasErrors,
  type FieldErrors,
} from "@/lib/authValidation";

type LoginResult = { token: string; user: { id: number; name: string; email: string; createdAt: string; updatedAt: string } };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validators: Record<string, (v: string) => string | null> = {
    email: validateEmail,
    password: validateLoginPassword,
  };

  const runValidation = (data = form): FieldErrors => ({
    email: validateEmail(data.email),
    password: validateLoginPassword(data.password),
  });

  const handleChange = (field: "email" | "password", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validators[field](form[field]) }));
  };

  const handleLogin = async () => {
    const errors = runValidation();
    setFieldErrors(errors);
    setTouched({ email: true, password: true });
    if (hasErrors(errors)) return;

    setLoading(true);
    setError("");

    try {
      const { data } = await apiRequest<LoginResult>(`/auth/login`, {
        method: "POST",
        body: { email: form.email.trim(), password: form.password },
      });

      if (!data?.token || !data?.user) {
        throw new Error("Invalid login response");
      }

      login(data.token, data.user);
      // Preserve "install extension" intent across authentication.
      const next = searchParams.get("next");
      router.push(next === "install" ? "/dashboard?install=1" : "/dashboard");
    } catch (err: unknown) {
      setError(errorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (field: string) =>
    `field-input${fieldErrors[field] ? " border-[var(--danger)]" : ""}`;

  return (
    <section className="mx-auto mt-10 max-w-md">
      <div className="mb-8"><p className="eyebrow">Welcome back</p><h1 className="page-title mt-2">Sign in</h1><p className="page-copy">Pick up your application search where you left off.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void handleLogin(); }} className="surface grid gap-5 p-6 sm:p-8" noValidate>
        {error && <p className="rounded-md bg-[#fff1ef] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</p>}

        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className={fieldClass("email")}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && <p id="email-error" className="mt-1 text-sm font-semibold text-[var(--danger)]">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            className={fieldClass("password")}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          {fieldErrors.password && <p id="password-error" className="mt-1 text-sm font-semibold text-[var(--danger)]">{fieldErrors.password}</p>}
        </div>

        <button type="submit" disabled={loading} className="button-primary w-full">{loading ? "Signing in..." : "Sign in"}</button>
        <p className="text-center text-sm text-[var(--muted)]">New here? <Link href="/signup" className="font-bold text-[var(--brand)]">Create an account</Link></p>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
