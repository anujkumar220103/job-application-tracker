// Centralized, fail-safe access to required server-side environment variables.
// Throws a clear error (without printing the secret value) when a required
// variable is missing, so the application fails safely instead of running
// with an undefined secret.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in your .env file (see .env.example).`,
    );
  }
  return value;
}

/** Returns the JWT signing secret, throwing if it is not configured. */
export function getJwtSecret(): string {
  return requireEnv("JWT_SECRET");
}

/** Returns the database connection string, throwing if it is not configured. */
export function getDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}

export const isProduction = process.env.NODE_ENV === "production";
