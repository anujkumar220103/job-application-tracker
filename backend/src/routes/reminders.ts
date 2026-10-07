import { Router } from "express";
import { getUserFromAuthHeader } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { addTimelineEvent } from "../lib/timeline.js";
import { reminderUpdateSchema } from "../lib/validation.js";
import {
  successResponse,
  errorResponse,
  validationError,
  handleRouteError,
} from "../lib/responseHandler.js";
import { send, parseId, authHeaderOf } from "../lib/httpAdapter.js";

export const remindersRouter = Router();

// PUT /api/reminders/:id
remindersRouter.put("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return send(res, errorResponse("NOT_FOUND", "Not found"));

    const job = await prisma.job.findUnique({ where: { id: reminder.jobId } });
    if (!job || job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const body = req.body ?? {};
    const parsed = reminderUpdateSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) {
      data.title = parsed.data.title;
      data.message = parsed.data.title;
    }
    if (parsed.data.remindAt !== undefined) {
      data.dueAt = new Date(parsed.data.remindAt);
      data.remindAt = new Date(parsed.data.remindAt);
    }
    if (parsed.data.completed !== undefined) {
      data.isSent = parsed.data.completed;
      data.sentAt = parsed.data.completed ? new Date() : null;
      data.completed = parsed.data.completed;
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;

    const updated = await prisma.reminder.update({ where: { id }, data });

    await addTimelineEvent({
      jobId: job.id,
      type: parsed.data.completed ? "reminder_completed" : "reminder_updated",
      title: parsed.data.completed ? "Reminder completed" : "Reminder updated",
      description: updated.title || updated.message,
      metadata: { reminderId: updated.id, completed: updated.completed },
    });

    return send(res, successResponse(updated, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// DELETE /api/reminders/:id
remindersRouter.delete("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return send(res, errorResponse("NOT_FOUND", "Not found"));

    const job = await prisma.job.findUnique({ where: { id: reminder.jobId } });
    if (!job || job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    await prisma.reminder.delete({ where: { id } });
    await addTimelineEvent({
      jobId: job.id,
      type: "reminder_deleted",
      title: "Reminder deleted",
      description: reminder.title || reminder.message,
      metadata: { reminderId: reminder.id },
    });

    return send(res, successResponse({ message: "Deleted" }, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});
