import { z } from "zod";
import { JOB_STATUSES } from "./jobStatus.js";

export const VALID_JOB_STATUSES = JOB_STATUSES;

const normalizeEmptyString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), schema);

const trimString = (value: unknown) => typeof value === "string" ? value.trim() : value;

// Shared field length limits.
export const LIMITS = {
  name: 100,
  email: 254,
  password: 200,
  company: 200,
  position: 200,
  location: 200,
  link: 2048,
  interviewTitle: 200,
  interviewer: 200,
  reminderTitle: 200,
  notes: 2000,
  search: 200,
} as const;

export const registerSchema = z.object({
  name: z.preprocess(trimString, z.string().min(1, "name is required").max(LIMITS.name, "name is too long")),
  email: z.preprocess(trimString, z.string().max(LIMITS.email, "email is too long").email("email must be a valid email")),
  password: z.string().min(8, "password must be at least 8 characters").max(LIMITS.password, "password is too long"),
});

export const loginSchema = z.object({
  email: z.preprocess(trimString, z.string().email("email must be a valid email")),
  password: z.string().min(1, "password is required"),
});

export const jobStatusSchema = z.enum(VALID_JOB_STATUSES, {
  error: "status must be one of: applied, interview, offer, rejected",
});

export const canonicalJobStatusSchema = jobStatusSchema;

const optionalUrlSchema = z
  .string()
  .trim()
  .max(LIMITS.link, "link is too long")
  .refine((value) => value === "" || /^https?:\/\//i.test(value), {
    message: "link must be a valid http or https URL",
  });

export const createJobSchema = z.object({
  company: z.preprocess(trimString, z.string().min(1, "company is required").max(LIMITS.company, "company is too long")),
  position: z.preprocess(trimString, z.string().min(1, "position is required").max(LIMITS.position, "position is too long")),
  location: z.preprocess(trimString, z.string().min(1, "location is required").max(LIMITS.location, "location is too long")),
  status: jobStatusSchema,
  link: optionalUrlSchema.default(""),
});

export const updateJobSchema = z.object({
  company: z.preprocess(trimString, z.string().min(1, "company is required").max(LIMITS.company, "company is too long").optional()),
  position: z.preprocess(trimString, z.string().min(1, "position is required").max(LIMITS.position, "position is too long").optional()),
  location: z.preprocess(trimString, z.string().min(1, "location is required").max(LIMITS.location, "location is too long").optional()),
  status: jobStatusSchema.optional(),
  link: optionalUrlSchema.optional(),
});

export const interviewSchema = z.object({
  title: z.preprocess(trimString, z.string().min(1, "title is required").max(LIMITS.interviewTitle, "title is too long")),
  type: z.enum(["phone", "video", "onsite", "panel", "other"]).optional(),
  dateTime: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "dateTime must be a valid ISO date string",
  }),
  interviewer: z.preprocess(trimString, z.string().max(LIMITS.interviewer, "interviewer is too long").optional()),
  meetingLink: z.preprocess(trimString, z.string().max(LIMITS.link, "meetingLink is too long").url("meetingLink must be a valid URL").optional()),
  location: z.preprocess(trimString, z.string().max(LIMITS.location, "location is too long").min(1, "location is required").optional().or(z.literal(""))),
  notes: z.preprocess(trimString, z.string().max(LIMITS.notes, "notes are too long").optional()),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

const reminderBaseSchema = z.object({
  title: z.preprocess(trimString, z.string().min(1, "title is required").max(LIMITS.reminderTitle, "title is too long")),
  notes: z.preprocess(trimString, z.string().max(LIMITS.notes, "notes are too long").optional()),
  remindAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "remindAt must be a valid ISO date string",
  }),
  completed: z.boolean().optional(),
});

export const reminderSchema = reminderBaseSchema.transform((value) => ({
  title: value.title,
  notes: value.notes ?? undefined,
  remindAt: value.remindAt,
  completed: value.completed ?? false,
}));

export const reminderUpdateSchema = z.object({
  title: z.preprocess(trimString, z.string().min(1, "title is required").max(LIMITS.reminderTitle, "title is too long").optional()),
  notes: z.preprocess(trimString, z.string().max(LIMITS.notes, "notes are too long").optional()),
  remindAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "remindAt must be a valid ISO date string",
  }).optional(),
  completed: z.boolean().optional(),
});

export const interviewUpdateSchema = z.object({
  title: z.preprocess(trimString, z.string().min(1, "title is required").max(LIMITS.interviewTitle, "title is too long").optional()),
  type: z.enum(["phone", "video", "onsite", "panel", "other"]).optional(),
  dateTime: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "dateTime must be a valid ISO date string",
  }).optional(),
  interviewer: z.preprocess(trimString, z.string().max(LIMITS.interviewer, "interviewer is too long").optional()),
  meetingLink: z.preprocess(trimString, z.string().max(LIMITS.link, "meetingLink is too long").url("meetingLink must be a valid URL").optional()),
  location: z.preprocess(trimString, z.string().max(LIMITS.location, "location is too long").min(1, "location is required").optional().or(z.literal(""))),
  notes: z.preprocess(trimString, z.string().max(LIMITS.notes, "notes are too long").optional()),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

// Fields the client is allowed to sort by (prevents arbitrary fields reaching Prisma).
export const VALID_SORT_FIELDS = ["createdAt", "company", "position", "location", "status"] as const;
export const VALID_SORT_ORDERS = ["asc", "desc"] as const;

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

const optionalDate = normalizeEmptyString(
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "date must be a valid ISO date string",
  }).optional(),
);

// Query schema used by GET /api/jobs for server-side search/filter/sort/pagination.
export const jobsQuerySchema = z.object({
  search: normalizeEmptyString(z.string().trim().max(LIMITS.search, "search is too long").optional()),
  company: normalizeEmptyString(z.string().trim().max(LIMITS.company, "company is too long").optional()),
  location: normalizeEmptyString(z.string().trim().max(LIMITS.location, "location is too long").optional()),
  status: normalizeEmptyString(z.enum(VALID_JOB_STATUSES, {
    error: "status must be one of: applied, interview, offer, rejected",
  }).optional()),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  sortBy: normalizeEmptyString(z.enum(VALID_SORT_FIELDS, {
    error: `sortBy must be one of: ${VALID_SORT_FIELDS.join(", ")}`,
  }).optional()).transform((value) => value ?? "createdAt"),
  sortOrder: normalizeEmptyString(z.enum(VALID_SORT_ORDERS, {
    error: "sortOrder must be one of: asc, desc",
  }).optional()).transform((value) => value ?? "desc"),
  page: normalizeEmptyString(z.coerce.number().int().min(1, "page must be >= 1").optional())
    .transform((value) => value ?? DEFAULT_PAGE),
  limit: normalizeEmptyString(z.coerce.number().int().min(1, "limit must be >= 1").max(MAX_LIMIT, `limit must be <= ${MAX_LIMIT}`).optional())
    .transform((value) => value ?? DEFAULT_LIMIT),
});

export type JobsQuery = z.infer<typeof jobsQuerySchema>;

// --- Phase 4: analytics ---
export const VALID_ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof VALID_ANALYTICS_RANGES)[number];

export const analyticsQuerySchema = z.object({
  range: normalizeEmptyString(
    z.enum(VALID_ANALYTICS_RANGES, {
      error: "range must be one of: 7d, 30d, 90d, all",
    }).optional(),
  ).transform((value) => value ?? "30d"),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

// --- Phase 4: duplicate detection ---
// Normalizes a string for case-insensitive, whitespace-tolerant comparison.
export function normalizeForComparison(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
