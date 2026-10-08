# Job Application Tracker

A full-stack job-application tracking platform with a **Next.js web app**, an
**Express REST API**, a **PostgreSQL** database (via Prisma), and a **Chrome
Extension (Manifest V3)** that captures jobs directly from LinkedIn, Unstop, and
Internshala while you apply.

---

## What this project does

Job seekers lose track of where they applied. This app gives every application a
single home and keeps the whole pipeline current:

- **Accounts & secure sessions** — register / login with JWT auth; passwords
  hashed with bcrypt; every API request is scoped to the authenticated user.
- **Job CRUD** — add, view, edit, and delete applications. Canonical statuses:
  `applied`, `interview`, `offer`, `rejected`.
- **Kanban board** — drag a card between status columns; the status updates
  optimistically and reverts if the server rejects it.
- **Server-side search / filter / sort / pagination** — search across
  company/position/location, filter by status/company/location/date range, sort,
  and paginate — all computed in the database, not the browser.
- **Application timeline** — a per-job activity log with **server-generated**
  events (created, status changed, interview scheduled/updated/completed/
  cancelled/deleted, reminder created/updated/completed/deleted).
- **Interview management** — full CRUD plus complete/cancel, each writing a
  distinct timeline event.
- **Follow-up reminders** — full CRUD plus complete/reopen.
- **Analytics dashboard** — total applications, status breakdown, interview/
  offer/rejection rates, an application trend chart, top companies, locations,
  and recent activity (all computed server-side).
- **Duplicate detection** — adding a job that already exists (same company +
  position, case/whitespace-insensitive) returns a friendly 409 instead of a
  silent duplicate.
- **Chrome Extension** — detects Apply / Easy Apply clicks on supported job
  sites, scrapes the job (best-effort), and saves it to your tracker using the
  same JWT. A popup shows your recent applications.

---

## Repository structure (monorepo)

```
job-application-tracker/
├── frontend/     → Next.js web app        (deployed on Vercel)
├── backend/      → Express REST API        (deployed on Render)
├── extension/    → Chrome Extension (MV3)  (loaded unpacked / Chrome Web Store)
└── README.md
```

---

## Architecture

```
                 ┌─────────────────────────┐
                 │   Chrome Extension (MV3) │
                 │   content.js (scrape)    │
                 │   background.js (SW)     │
                 └───────────┬──────────────┘
                             │ HTTPS + JWT (Bearer)
                             ▼
┌──────────────────┐   HTTPS + JWT    ┌───────────────────────────┐   Prisma 7    ┌──────────────────┐
│  Frontend         │ ───────────────▶ │  Backend                   │ ────────────▶ │  PostgreSQL      │
│  Next.js (Vercel) │   (Bearer token) │  Express API (Render)      │  @adapter-pg  │  (Neon)          │
│  React 19         │ ◀─────────────── │  /api/** routes            │ ◀──────────── │                  │
└──────────────────┘   { data|error } └───────────────────────────┘               └──────────────────┘
```

- **Stateless auth:** the JWT is stored in the browser `localStorage["token"]`
  and sent as `Authorization: Bearer <token>`. No cookies, no server sessions.
- **One API contract everywhere:**
  - Success: `{ "data": <payload>, "meta"?: { ... } }`
  - Error:   `{ "error": { "code": string, "message": string, "details"?: unknown } }`
  - `500` responses never leak internal/Prisma details (generic message; full
    error logged server-side only).
- **Ownership:** `userId` is always derived from the JWT (never trusted from the
  client); every job/interview/reminder/timeline route verifies the record
  belongs to the caller.
- The extension talks **directly to the backend** (same contract), not to the
  frontend.

---

## Tech stack (verified against the actual code)

### Frontend — `frontend/`

| Tech | Version | Where / how it is used |
|------|---------|------------------------|
| Next.js (App Router, Turbopack, React Compiler) | 16 | Whole app in `src/app/**` (home, login, signup, dashboard, jobs, add-job). `next.config.ts`: `reactCompiler: true`, `turbopack.root`. |
| React | 19.2.0 | All components/pages (`useState`, `useEffect`, `useContext`, `Suspense`). |
| react-dom | 19.2.0 | Rendering (with Next). |
| TypeScript | 5 | Entire frontend `.ts`/`.tsx`; `tsconfig.json`. |
| Tailwind CSS | 4 | Styling. `postcss.config.mjs` → `@tailwindcss/postcss`; `globals.css` → `@import "tailwindcss"`. |
| ESLint (+ `eslint-config-next`) | 9 | `npm run lint`. |
| Native `fetch` | — | All API calls via `src/lib/apiClient.ts` + `AuthContext` (no axios). |
| React Context | — | `context/AuthContext.tsx` (session/JWT), `context/ToastContext.tsx` (toasts). |
| Custom form validation | — | `src/lib/authValidation.ts` (hand-rolled; mirrors backend rules). |

Runtime dependencies are only `next`, `react`, `react-dom`.
**Not used:** axios, react-hook-form, Zod (frontend), any UI kit (MUI/Chakra),
any chart library (analytics bars are plain CSS/divs).

### Backend — `backend/`

| Tech | Version | Where / how it is used |
|------|---------|------------------------|
| Node.js + Express | Express 4.21 | API server `src/server.ts` + routes `src/routes/*.ts` (auth, jobs, interviews, reminders, analytics). ESM (`"type": "module"`). |
| TypeScript | 5 | Entire backend `src/**`. Build: `tsc -p tsconfig.json` → `dist/`. |
| tsx | 4.19 | Dev server (`tsx watch src/server.ts`). |
| Prisma ORM | 7.1 | DB access. Schema `prisma/schema.prisma`; client `src/lib/prisma.ts`. |
| @prisma/adapter-pg (PrismaPg) | 7.1 | PostgreSQL driver adapter for Prisma — `src/lib/prisma.ts`. |
| PostgreSQL (Neon) | — | Database (`DATABASE_URL`). Models: `User`, `Job`, `JobTimelineEvent`, `Interview`, `Reminder` (+ indexes). |
| jsonwebtoken (JWT) | 9 | Sign on login (`controllers/authController.ts`), verify (`lib/auth.ts`). |
| bcryptjs | 3 | Password hashing/compare (`controllers/authController.ts`). |
| Zod | 4 | Request validation (`lib/validation.ts`): register/login/job/interview/reminder/query schemas. |
| cors | 2.8 | CORS config (`server.ts`): allows configured origins + any `*.vercel.app`. |
| dotenv | 16 | Env loading (`import "dotenv/config"` in `server.ts`). |
| Vitest | 1.6 | Backend tests (`vitest.config.ts`): 5 files, 40 tests (auth/jobs/analytics/duplicate/validation). |

Package manager: **Yarn 1.22.22** (`yarn.lock`). Deploy: Render.

### Chrome Extension — `extension/`

| Tech | Where / how it is used |
|------|------------------------|
| Chrome Extension Manifest V3 | `manifest.json` (service worker, content scripts, host permissions, popup). |
| Vanilla JavaScript (no framework, no build step) | `background.js` (service worker — backend calls), `content.js` (scraping + apply detection), `saveToken.js` (localStorage → chrome.storage token bridge), `config.js` (central API/frontend URLs), `popup/popup.js` + `popup.html`. |
| Chrome Extension APIs | `chrome.runtime`, `chrome.storage.local`, `chrome.scripting`, `chrome.tabs`. |
| Native `fetch` | Backend calls (`POST`/`GET /api/jobs`) with `Authorization: Bearer`. |
| `node:test` + `vm` | Unit tests in `lib/*.test.mjs` (core logic, LinkedIn DOM, Internshala regression, lifecycle) — no test framework/dependency. |
| Shared core (`lib/jobTracker.core.js`) | Pure logic: payload shaping, validation, apply-label matching, response mapping. |

Supported sites: **LinkedIn, Unstop, Internshala**. No npm packages — pure JS,
loadable directly in Chrome.

---

## Overall summary

- **Languages:** TypeScript (frontend + backend), vanilla JavaScript (extension), SQL (via Prisma).
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4.
- **Backend:** Express 4 (TypeScript, ESM).
- **Database:** PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg`.
- **Auth:** JWT (`jsonwebtoken`) + bcryptjs; token in `localStorage`, bearer header.
- **Validation:** Zod (backend), custom validators (frontend).
- **Testing:** Vitest (backend, 40 tests) + `node:test` (extension).
- **HTTP client:** native `fetch` everywhere (no axios).
- **Deployment:** Frontend → Vercel · Backend → Render · DB → Neon · Extension → Chrome.

---

## Database models

| Model | Key fields | Relations |
|-------|-----------|-----------|
| `User` | id, name, email (unique), password (hashed), createdAt, updatedAt | has many `Job` |
| `Job` | id, company, position, location, status, link, userId (nullable), timestamps | belongs to `User`; has many timeline/interviews/reminders. Indexes: `userId`, `status`, `(userId,status)` |
| `JobTimelineEvent` | id, jobId, type, title, description?, metadata (JSON)?, createdAt | belongs to `Job` (cascade). Index: `jobId` |
| `Interview` | id, jobId, title, type?, dateTime, interviewer?, meetingLink?, location?, notes?, status (default `scheduled`), timestamps | belongs to `Job` (cascade). Index: `jobId` |
| `Reminder` | id, jobId, title, message, notes?, dueAt, remindAt, sentAt?, isSent, completed, timestamps | belongs to `Job` (cascade). Index: `jobId` |

---

## Key API endpoints

Base path: `/api` (backend origin). All non-auth routes require
`Authorization: Bearer <token>` and are scoped to the authenticated user.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check (`{ data: { status: "ok" } }`). |
| POST | `/api/auth/register` | Create account. |
| POST | `/api/auth/login` | Login → `{ data: { token, user } }`. |
| GET | `/api/auth/me` | Current user from the token. |
| GET | `/api/jobs` | List jobs — `search, company, location, status, dateFrom, dateTo, sortBy, sortOrder, page, limit`; returns `{ data, meta.pagination }`. |
| POST | `/api/jobs` | Create job (409 on duplicate). |
| GET / PUT / DELETE | `/api/jobs/:id` | Read / update / delete a job (ownership enforced). |
| GET | `/api/jobs/:id/timeline` | Server-generated timeline events. |
| GET / POST | `/api/jobs/:id/interviews` | List / create interviews. |
| PUT / DELETE | `/api/interviews/:id` | Update (incl. complete/cancel) / delete an interview. |
| GET / POST | `/api/jobs/:id/reminders` | List / create reminders. |
| PUT / DELETE | `/api/reminders/:id` | Update (incl. complete) / delete a reminder. |
| GET | `/api/analytics?range=7d\|30d\|90d\|all` | Analytics for the current user. |

---

## Environment variables

### Backend — `backend/.env` (copy from `backend/.env.example`)

| Variable | Example / note |
|----------|----------------|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require` (Neon) |
| `JWT_SECRET` | long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | `5000` (dev default) |
| `CORS_ORIGIN` | comma-separated allowed frontend origins, e.g. `http://localhost:3000` (prod: your Vercel URL) |
| `NODE_ENV` | `development` / `production` |

> Secrets live only in the backend. Never put `DATABASE_URL`/`JWT_SECRET` in any
> `NEXT_PUBLIC_*` variable. Never commit a real `.env`.

### Frontend — `frontend/.env.local` (copy from `frontend/.env.example`)

| Variable | Example / note |
|----------|----------------|
| `NEXT_PUBLIC_API_URL` | backend API base, e.g. `http://localhost:5000/api` (prod: `https://<backend>/api`). `/api` is auto-appended if omitted. |
| `NEXT_PUBLIC_CHROME_EXTENSION_INSTALL_URL` | optional Chrome Web Store URL for the "Add Extension" button. |

### Extension — `extension/config.js`

Edit `API_BASE_URL` and `FRONTEND_BASE_URL` for your environment (localhost for
dev, deployed URLs for production). Keep `manifest.json` host permissions in sync.

---

## Run locally

Prerequisites: **Node.js ≥ 20**, a PostgreSQL database (local or a free Neon
instance), and Chrome (for the extension). The backend uses **Yarn**; the
frontend uses **npm**.

### 1) Backend (`backend/`)

```bash
cd backend
yarn install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
yarn prisma:generate        # generate Prisma client
yarn prisma:migrate         # apply migrations (prisma migrate deploy)
yarn dev                    # starts on http://localhost:5000
```

Verify: open `http://localhost:5000/api/health` → `{ "data": { "status": "ok" } }`.

### 2) Frontend (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                 # starts on http://localhost:3000
```

Open `http://localhost:3000`, create an account, and start adding jobs.

### 3) Chrome Extension (`extension/`) — optional

1. In `extension/config.js`, set `API_BASE_URL=http://localhost:5000/api` and
   `FRONTEND_BASE_URL=http://localhost:3000` (and ensure `manifest.json`
   host permissions include your backend origin).
2. Go to `chrome://extensions` → enable **Developer mode** → **Load unpacked**
   → select the `extension/` folder.
3. Log in on the web app first (the extension reads your JWT from the page via
   `saveToken.js`), then open a LinkedIn / Unstop / Internshala job and click
   Apply — the job is saved to your tracker.

---

## Scripts

**Backend** (`cd backend`):

```bash
yarn dev              # tsx watch (dev server)
yarn build            # tsc -p tsconfig.json → dist/
yarn start            # node dist/server.js
yarn typecheck        # tsc --noEmit
yarn test             # vitest run (40 tests)
yarn prisma:generate  # prisma generate
yarn prisma:migrate   # prisma migrate deploy
yarn prisma:studio    # prisma studio (DB GUI)
```

**Frontend** (`cd frontend`):

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint
```

**Extension** (`cd extension`):

```bash
node --test lib/*.test.mjs   # run extension unit tests
```

---

## Deployment

| Part | Host | Notes |
|------|------|-------|
| Frontend | **Vercel** | Root Directory = `frontend`. Set `NEXT_PUBLIC_API_URL` to the deployed backend `/api`. |
| Backend | **Render** | Root Directory = `backend`. Build `yarn install && yarn build`, start `yarn start`. Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (your Vercel URL), `NODE_ENV=production`. |
| Database | **Neon** | PostgreSQL; use the pooled connection string. |
| Extension | **Chrome** | Load unpacked, or publish to the Chrome Web Store and set `NEXT_PUBLIC_CHROME_EXTENSION_INSTALL_URL`. |

---

## Notes / known design choices

- `Job.userId` is intentionally **nullable** (`onDelete: SetNull`): deleting a
  user leaves their jobs with a null `userId` instead of cascading. Making it
  required would need a data backfill, so it is left as-is to avoid data loss.
- The `Reminder` model keeps a few parallel fields (`title`/`message`,
  `remindAt`/`dueAt`, `completed`/`isSent`) that the API keeps in sync — minor
  tech debt, left as-is to avoid a risky migration.
- Extension capture is **best-effort**: if a field (e.g. company/location) can't
  be scraped, a safe placeholder is used so the job is still created; you can
  edit all five fields later from the dashboard.
- On Render's free tier the backend may cold-start (~30–60s) after idle; the
  first request after a pause can be slow.
```
