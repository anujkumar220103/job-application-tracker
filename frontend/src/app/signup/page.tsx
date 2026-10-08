"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiRequest, errorMessage } from "@/lib/apiClient";
import {
  validateName,
  validateEmail,
  validateNewPassword,
  hasErrors,
  type FieldErrors,
} from "@/lib/authValidation";

function SignupForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validators: Record<string, (v: string) => string | null> = {
    name: validateName,
    email: validateEmail,
    password: validateNewPassword,
  };

  const runValidation = (data = form): FieldErrors => ({
    name: validateName(data.name),
    email: validateEmail(data.email),
    password: validateNewPassword(data.password),
  });

  const handleChange = (field: "name" | "email" | "password", value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    // Re-validate this field live once the user has interacted with it.
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  const handleBlur = (field: "name" | "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validators[field](form[field]) }));
  };

  const handleSignup = async () => {
    // Validate everything on submit and surface all errors at once.
    const errors = runValidation();
    setFieldErrors(errors);
    setTouched({ name: true, email: true, password: true });
    if (hasErrors(errors)) return;

    setLoading(true);
    setError("");
    try {
      await apiRequest(`/auth/register`, {
        method: "POST",
        body: { name: form.name.trim(), email: form.email.trim(), password: form.password },
      });
      // Forward the install intent through to login so the chain continues.
      const next = searchParams.get("next");
      window.location.href = next === "install" ? "/login?next=install" : "/login";
    } catch (err: unknown) {
      setError(errorMessage(err, "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (field: string) =>
    `field-input${fieldErrors[field] ? " border-[var(--danger)]" : ""}`;

  return (
    <section className="mx-auto mt-10 max-w-md">
      <div className="mb-8"><p className="eyebrow">Start organized</p><h1 className="page-title mt-2">Create your account</h1><p className="page-copy">A calmer way to keep track of every opportunity.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void handleSignup(); }} className="surface grid gap-5 p-6 sm:p-8" noValidate>
        {error && <p className="rounded-md bg-[#fff1ef] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</p>}

        <div>
          <label className="field-label" htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            className={fieldClass("name")}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && <p id="name-error" className="mt-1 text-sm font-semibold text-[var(--danger)]">{fieldErrors.name}</p>}
        </div>

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
            aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
          />
          {fieldErrors.password ? (
            <p id="password-error" className="mt-1 text-sm font-semibold text-[var(--danger)]">{fieldErrors.password}</p>
          ) : (
            <p id="password-hint" className="mt-1 text-xs text-[var(--muted)]">Use at least 8 characters.</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="button-primary w-full">{loading ? "Creating account..." : "Create account"}</button>
        <p className="text-center text-sm text-[var(--muted)]">Already have an account? <Link href="/login" className="font-bold text-[var(--brand)]">Sign in</Link></p>
      </form>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
