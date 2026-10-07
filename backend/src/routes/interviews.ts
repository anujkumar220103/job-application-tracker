import { Router } from "express";
import { getUserFromAuthHeader } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { interviewUpdateSchema } from "../lib/validation.js";
import { addTimelineEvent, type TimelineEventType } from "../lib/timeline.js";
import {
  successResponse,
  errorResponse,
  validationError,
  handleRouteError,
} from "../lib/responseHandler.js";
import { send, parseId, authHeaderOf } from "../lib/httpAdapter.js";

export const interviewsRouter = Router();

// PUT /api/interviews/:id
interviewsRouter.put("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) return send(res, errorResponse("NOT_FOUND", "Not found"));

    const job = await prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job || job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    const body = req.body ?? {};
    const parsed = interviewUpdateSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.dateTime !== undefined) data.dateTime = new Date(parsed.data.dateTime);
    if (parsed.data.interviewer !== undefined) data.interviewer = parsed.data.interviewer || null;
    if (parsed.data.meetingLink !== undefined) data.meetingLink = parsed.data.meetingLink || null;
    if (parsed.data.location !== undefined) data.location = parsed.data.location || null;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    const updated = await prisma.interview.update({ where: { id }, data });

    const statusChanged = parsed.data.status !== undefined && parsed.data.status !== interview.status;
    let eventType: TimelineEventType = "interview_updated";
    let eventTitle = "Interview updated";
    let eventDescription = `${updated.title} was updated`;

    if (statusChanged && parsed.data.status === "completed") {
      eventType = "interview_completed";
      eventTitle = "Interview completed";
      eventDescription = `${updated.title} was marked completed`;
    } else if (statusChanged && parsed.data.status === "cancelled") {
      eventType = "interview_cancelled";
      eventTitle = "Interview cancelled";
      eventDescription = `${updated.title} was cancelled`;
    }

    await addTimelineEvent({
      jobId: job.id,
      type: eventType,
      title: eventTitle,
      description: eventDescription,
      metadata: { interviewId: updated.id, status: updated.status },
    });

    return send(res, successResponse(updated, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// DELETE /api/interviews/:id
interviewsRouter.delete("/:id", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const id = parseId(req.params.id);
    if (id === null) return send(res, errorResponse("INVALID_ID", "Invalid id"));

    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) return send(res, errorResponse("NOT_FOUND", "Not found"));

    const job = await prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job || job.userId !== user.id) return send(res, errorResponse("FORBIDDEN", "Forbidden"));

    await prisma.interview.delete({ where: { id } });
    await addTimelineEvent({
      jobId: job.id,
      type: "interview_deleted",
      title: "Interview deleted",
      description: `${interview.title} was deleted`,
      metadata: { interviewId: interview.id },
    });

    return send(res, successResponse({ message: "Deleted" }, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});
