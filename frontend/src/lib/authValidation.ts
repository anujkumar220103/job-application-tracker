// Client-side validation for the auth forms. These rules mirror the backend's
// Zod schemas (registerSchema / loginSchema) so the user gets immediate,
// field-level feedback that matches what the server will accept.
//
// Backend rules:
//   - name:     required, 1–100 chars
//   - email:    required, valid email, <= 254 chars
//   - password: register -> min 8 chars (max 200); login -> required (min 1)

export const AUTH_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 200,
} as const;

// A pragmatic email check (not overly strict): something@something.tld
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return "Name is required.";
  if (v.length > AUTH_LIMITS.nameMax) return `Name must be ${AUTH_LIMITS.nameMax} characters or fewer.`;
  return null;
}

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Email is required.";
  if (v.length > AUTH_LIMITS.emailMax) return "Email is too long.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return null;
}

// Registration password: enforce the backend minimum (8).
export function validateNewPassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < AUTH_LIMITS.passwordMin) {
    return `Password must be at least ${AUTH_LIMITS.passwordMin} characters.`;
  }
  if (value.length > AUTH_LIMITS.passwordMax) return "Password is too long.";
  return null;
}

// Login password: only required (the server verifies correctness).
export function validateLoginPassword(value: string): string | null {
  if (!value) return "Password is required.";
  return null;
}

export type FieldErrors = Record<string, string | null>;

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((e) => Boolean(e));
}
