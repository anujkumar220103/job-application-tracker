# Job Application Tracker

A full-stack Next.js app for tracking job applications: authentication, job CRUD,
a Kanban pipeline with drag-and-drop, server-side search/filter/sort/pagination,
and per-application timeline, interviews, and reminders.

> Scope note: this repository contains the web application only. A Chrome
> extension and AI features are described in the roadmap below but are **not**
> implemented here.

---

## Tech stack (actual)

| Layer | Technology |
|------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Backend | Next.js Route Handlers (`src/app/api/**`) — no Express |
| Database | PostgreSQL |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | JWT (`jsonwebtoken`), passwords hashed with `bcryptjs` |
| Validation | Zod 4 |
| Testing | Vitest |

There is **no `middleware.ts`**. Route protection is implemented per route
handler via `getUserFromRequest` (reads and verifies the `Authorization: Bearer`
JWT, then loads the user).

---

## Architecture

```
application/
  prisma/              Prisma schema + migrations
  src/
    app/               App Router pages + API route handlers
      api/             auth, jobs, jobs/[id]/{timeline,interviews,reminders},
                       interviews/[id], reminders/[id]
    components/        UI (JobsBoard, JobTimeline, InterviewPanel, ReminderPanel, ...)
    context/           AuthContext, ToastContext
    controllers/       auth + job business logic
    lib/               auth, prisma, env, validation, responseHandler, timeline, ...
    types/
```

### API response contract

All API responses use a single consistent envelope:

- Success: `{ "data": <payload>, "meta"?: { ... } }`
- Error:   `{ "error": { "code": string, "message": string, "details"?: unknown } }`

500 responses never expose internal/Prisma error details; they return a generic
message and the full error is logged server-side only.

### Key endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Create user |
| POST | `/api/auth/login` | Returns `{ data: { token, user } }`; generic error on bad credentials |
| GET | `/api/auth/me` | Current user |
| GET | `/api/jobs` | Server-side `search, company, location, status, dateFrom, dateTo, sortBy, sortOrder, page, limit`; scoped to the authenticated user |
| POST | `/api/jobs` | Create job (userId derived from JWT) |
| GET/PUT/DELETE | `/api/jobs/[id]` | Ownership enforced |
| GET | `/api/jobs/[id]/timeline` | Timeline events (server-generated) |
| GET/POST | `/api/jobs/[id]/interviews` | List / create interviews |
| PUT/DELETE | `/api/interviews/[id]` | Update (incl. complete/cancel) / delete |
| GET/POST | `/api/jobs/[id]/reminders` | List / create reminders |
| PUT/DELETE | `/api/reminders/[id]` | Update (incl. complete) / delete |

---

## Implemented

- Authentication (register, login, session via JWT) with bcrypt password hashing.
- Per-user ownership checks on every job/interview/reminder/timeline route.
- Job CRUD with canonical statuses: `applied`, `interview`, `offer`, `rejected`.
- **Server-side** search, company/location filters, status filter, date filtering,
  sorting, and pagination on `GET /api/jobs`.
- Kanban board with native drag-and-drop and optimistic status updates (revert on error).
- Application timeline with **server-generated** events, including distinct
  `interview_completed` and `interview_cancelled` events.
- Interview management (full CRUD + complete/cancel).
- Follow-up reminders (full CRUD + complete/reopen).
- Consistent API response envelope and safe error handling.
- Toasts, confirmation dialogs for destructive actions, and an accessible modal
  (Escape to close, focus handling).
- Vitest suite covering Phase 1 (auth/ownership), Phase 2 (query/filter/sort/
  pagination/validation), and Phase 3 (timeline/interviews/reminders).

## Planned / future (NOT implemented in this repo)

- Chrome Extension (job scraping from LinkedIn/Internshala/Unstop).
- Analytics dashboard.
- Duplicate application detection.
- AI job-description / resume matching and recommendations.
- Email automation.
- Additional authentication providers.

---

## Environment variables

Create `.env` at the repository root (it is git-ignored). See `.env.example`.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_API_URL="/api"   # optional; omit to use same-origin /api
```

Required secrets (`DATABASE_URL`, `JWT_SECRET`) are read through `src/lib/env.ts`,
which throws a clear error if a required variable is missing so the app fails
safely rather than running with an undefined secret.

> Security: never commit a real `.env`. If credentials are ever committed, rotate
> them at the provider and purge them from git history.

## Running locally

```bash
cd application
npm install
npx prisma migrate deploy   # applies existing migrations (additive)
npx prisma generate
npm run dev
```

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run lint    # eslint
npm test        # vitest (run mode)
```

---

## Notes on the data model

- `Job.userId` is intentionally **nullable**. The relation uses `onDelete: SetNull`,
  so deleting a user leaves their jobs with a null `userId`. Making it required
  would require backfilling/cleaning any existing orphaned rows and is not done
  automatically to avoid data loss.
- The `Reminder` model currently keeps a few parallel fields
  (`title`/`message`, `remindAt`/`dueAt`, `completed`/`isSent`) that the API keeps
  in sync. A future, non-destructive cleanup could collapse these; it is left as-is
  for now to avoid a risky migration. See the implementation report.
```
