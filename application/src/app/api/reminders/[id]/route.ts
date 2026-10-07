import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";
import { reminderUpdateSchema } from "@/lib/validation";
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

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return errorResponse("NOT_FOUND", "Not found");

    const job = await prisma.job.findUnique({ where: { id: reminder.jobId } });
    if (!job || job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    const body = await req.json().catch(() => ({}));
    const parsed = reminderUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

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

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return errorResponse("NOT_FOUND", "Not found");

    const job = await prisma.job.findUnique({ where: { id: reminder.jobId } });
    if (!job || job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    await prisma.reminder.delete({ where: { id } });
    await addTimelineEvent({
      jobId: job.id,
      type: "reminder_deleted",
      title: "Reminder deleted",
      description: reminder.title || reminder.message,
      metadata: { reminderId: reminder.id },
    });

    return successResponse({ message: "Deleted" }, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
