import "dotenv/config";
import express from "express";
import cors from "cors";

import { authRouter } from "./routes/auth.js";
import { jobsRouter } from "./routes/jobs.js";
import { interviewsRouter } from "./routes/interviews.js";
import { remindersRouter } from "./routes/reminders.js";
import { analyticsRouter } from "./routes/analytics.js";

const app = express();

// --- CORS -------------------------------------------------------------------
// The frontend and backend are now separate origins. The frontend sends its
// JWT in the Authorization header (localStorage-based), NOT cookies, so we do
// not need credentialed CORS. We still explicitly allow the configured
// frontend origin(s) rather than using "*", and permit the Authorization
// header and all HTTP methods the API uses.
//
// CORS_ORIGIN may be a comma-separated list of exact allowed origins. In
// development it defaults to the Next.js dev server at http://localhost:3000.
// In production, set it to the deployed frontend origin(s) via the environment.
//
// In addition to the configured list, any *.vercel.app origin is allowed so
// that the Vercel production deployment AND its preview deployments work
// without having to re-list every generated preview URL. We still never use
// "*", and credentials stay off (auth travels in the Authorization header).
const rawOrigins = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  // Non-browser clients (curl, server-to-server) send no Origin header.
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    // Allow Vercel-hosted frontends (production + preview) over https.
    if (protocol === "https:" && (hostname === "vercel.app" || hostname.endsWith(".vercel.app"))) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // Auth uses the Authorization header, not cookies, so credentials stay off.
    credentials: false,
  }),
);

app.use(express.json());

// --- Routes -----------------------------------------------------------------
// Paths are mounted under /api to preserve the frontend's existing effective
// API paths (e.g. POST /api/auth/login), matching the original Next.js routes.
app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/interviews", interviewsRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/analytics", analyticsRouter);

// Lightweight health check (does not change any existing contract).
app.get("/api/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

// Fallback 404 in the standardized error envelope.
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
});

const PORT = Number(process.env.PORT ?? 5000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] API server listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[backend] CORS allowed origins: ${allowedOrigins.join(", ")}`);
});

export { app };
