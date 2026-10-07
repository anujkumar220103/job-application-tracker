import { Router } from "express";
import {
  getAllJobs,
  createJob,
  getJobById,
  updateJob,
  deleteJob,
  findDuplicateJob,
  type JobQueryOptions,
} from "../controllers/jobController.js";
import { getUserFromAuthHeader } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { addTimelineEvent } from "../lib/timeline.js";
import { getJobTimeline } from "../lib/timeline.js";
import {
  createJobSchema,
  updateJobSchema,
  jobsQuerySchema,
  interviewSchema,
  reminderSchema,
  DEFAULT_LIMIT,
} from "../lib/validation.js";
import {
  successResponse,
  errorResponse,
  validationError,
  handleRouteError,
} from "../lib/responseHandler.js";
import { send, parseId, authHeaderOf } from "../lib/httpAdapter.js";

export const jobsRouter = Router();

// GET /api/jobs
jobsRouter.get("/", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const parsed = jobsQuerySchema.safeParse(req.query);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const options: JobQueryOptions = parsed.data;
    const result = await getAllJobs(user.id, options);

    const jobs = Array.isArray(result) ? result : result.jobs;
    const total = Array.isArray(result) ? result.length : result.total;
    const limit = options.limit || DEFAULT_LIMIT;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return send(
      res,
      successResponse(jobs, 200, {
        pagination: {
          page: options.page,
          limit,
          total,
          totalPages,
        },
      }),
    );
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// POST /api/jobs
jobsRouter.post("/", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const body = req.body ?? {};
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const duplicate = await findDuplicateJob(user.id, {
      company: parsed.data.company,
      position: parsed.data.position,
      link: parsed.data.link,
    });
    if (duplicate) {
      return send(
        res,
        errorResponse(
          "DUPLICATE_APPLICATION",
          "A similar application already exists.",
          {
            existingJobId: duplicate.id,
            company: duplicate.company,
            position: duplicate.position,
            status: duplicate.status,
          },
        ),
      );
    }

    const job = await createJob({
      company: parsed.data.company,
      position: parsed.data.position,
      location: parsed.data.location,
      status: parsed.data.status,
      link: parsed.data.link,
      userId: user.id,
    });

    return send(res, successResponse(job, 201));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// GET /api/jobs/:id
jobsRouter.get("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const job = await getJobById(id);
    if (!job) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    return send(res, successResponse(job, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// PUT /api/jobs/:id
jobsRouter.put("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const body = req.body ?? {};

    const existing = await getJobById(id);
    if (!existing) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (existing.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    if (parsed.data.company !== undefined || parsed.data.position !== undefined) {
      const effectiveCompany = parsed.data.company ?? existing.company;
      const effectivePosition = parsed.data.position ?? existing.position;
      const effectiveLink = parsed.data.link ?? existing.link;
      const duplicate = await findDuplicateJob(
        user.id,
        { company: effectiveCompany, position: effectivePosition, link: effectiveLink },
        id,
      );
      if (duplicate) {
        return send(
          res,
          errorResponse(
            "DUPLICATE_APPLICATION",
            "A similar application already exists.",
            {
              existingJobId: duplicate.id,
              company: duplicate.company,
              position: duplicate.position,
              status: duplicate.status,
            },
          ),
        );
      }
    }

    const dataToUpdate: Partial<{
      company: string;
      position: string;
      location: string;
      status: string;
      link: string;
    }> = {};

    if (parsed.data.company !== undefined) dataToUpdate.company = parsed.data.company;
    if (parsed.data.position !== undefined) dataToUpdate.position = parsed.data.position;
    if (parsed.data.location !== undefined) dataToUpdate.location = parsed.data.location;
    if (parsed.data.status !== undefined) dataToUpdate.status = parsed.data.status;
    if (parsed.data.link !== undefined) dataToUpdate.link = parsed.data.link ?? "";

    const updated = await updateJob(id, dataToUpdate);
    return send(res, successResponse(updated, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// DELETE /api/jobs/:id
jobsRouter.delete("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const existing = await getJobById(id);
    if (!existing) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (existing.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    await deleteJob(id);
    return send(res, successResponse({ message: "Deleted" }, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// GET /api/jobs/:id/timeline
jobsRouter.get("/:id/timeline", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const jobId = Number(req.params.id);
    if (!Number.isInteger(jobId)) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const job = await getJobById(jobId);
    if (!job) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const items = await getJobTimeline(jobId);
    return send(res, successResponse(items, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// GET /api/jobs/:id/interviews
jobsRouter.get("/:id/interviews", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const jobId = parseId(req.params.id);
    if (jobId === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const job = await getJobById(jobId);
    if (!job) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const interviews = await prisma.interview.findMany({
      where: { jobId },
      orderBy: { dateTime: "asc" },
    });

    return send(res, successResponse(interviews, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// POST /api/jobs/:id/interviews
jobsRouter.post("/:id/interviews", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const jobId = parseId(req.params.id);
    if (jobId === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const job = await getJobById(jobId);
    if (!job) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const body = req.body ?? {};
    const parsed = interviewSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const interview = await prisma.interview.create({
      data: {
        jobId,
        title: parsed.data.title,
        type: parsed.data.type ?? null,
        dateTime: new Date(parsed.data.dateTime),
        interviewer: parsed.data.interviewer || null,
        meetingLink: parsed.data.meetingLink || null,
        location: parsed.data.location || null,
        notes: parsed.data.notes || null,
        status: "scheduled",
      },
    });

    await addTimelineEvent({
      jobId,
      type: "interview_scheduled",
      title: "Interview scheduled",
      description: `${parsed.data.title} scheduled for ${new Date(parsed.data.dateTime).toISOString()}`,
      metadata: { interviewId: interview.id },
    });

    return send(res, successResponse(interview, 201));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// GET /api/jobs/:id/reminders
jobsRouter.get("/:id/reminders", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const jobId = parseId(req.params.id);
    if (jobId === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const job = await getJobById(jobId);
    if (!job) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const reminders = await prisma.reminder.findMany({
      where: { jobId },
      orderBy: { remindAt: "asc" },
    });

    return send(res, successResponse(reminders, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// POST /api/jobs/:id/reminders
jobsRouter.post("/:id/reminders", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const jobId = parseId(req.params.id);
    if (jobId === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const job = await getJobById(jobId);
    if (!job) return send(res, errorResponse("NOT_FOUND", "Not found"));
    if (job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const body = req.body ?? {};
    const parsed = reminderSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const reminder = await prisma.reminder.create({
      data: {
        jobId,
        title: parsed.data.title,
        message: parsed.data.title,
        notes: parsed.data.notes || null,
        dueAt: new Date(parsed.data.remindAt),
        remindAt: new Date(parsed.data.remindAt),
        completed: parsed.data.completed,
        isSent: parsed.data.completed,
        sentAt: parsed.data.completed ? new Date() : null,
      },
    });

    await addTimelineEvent({
      jobId,
      type: "reminder_created",
      title: "Reminder created",
      description: parsed.data.title,
      metadata: { reminderId: reminder.id },
    });

    return send(res, successResponse(reminder, 201));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});
