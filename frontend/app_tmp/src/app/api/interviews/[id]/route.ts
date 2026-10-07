import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { interviewUpdateSchema } from "@/lib/validation";
import { addTimelineEvent, type TimelineEventType } from "@/lib/timeline";
import { successResponse, errorResponse, validationError, handleRouteError } from "@/lib/responseHandler";

function parseId(value: string | number | undefined) {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return errorResponse("INVALID_ID", "Invalid id");

    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) return errorResponse("NOT_FOUND", "Not found");

    const job = await prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job || job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    const body = await req.json().catch(() => ({}));
    const parsed = interviewUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

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

    // Choose a specific timeline event for status transitions so that
    // "completed" and "cancelled" are distinguishable from generic updates.
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

    return successResponse(updated, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return errorResponse("INVALID_ID", "Invalid id");

    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) return errorResponse("NOT_FOUND", "Not found");

    const job = await prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job || job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    await prisma.interview.delete({ where: { id } });
    await addTimelineEvent({
      jobId: job.id,
      type: "interview_deleted",
      title: "Interview deleted",
      description: `${interview.title} was deleted`,
      metadata: { interviewId: interview.id },
    });

    return successResponse({ message: "Deleted" }, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
