import { getUserFromRequest } from "@/lib/auth";
import { getJobById } from "@/controllers/jobController";
import prisma from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";
import { reminderSchema } from "@/lib/validation";
import { successResponse, errorResponse, validationError, handleRouteError } from "@/lib/responseHandler";

function parseId(value: string | number | undefined) {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const jobId = parseId(params.id);
    if (jobId === null) return errorResponse("INVALID_ID", "Invalid id");

    const job = await getJobById(jobId);
    if (!job) return errorResponse("NOT_FOUND", "Not found");
    if (job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    const reminders = await prisma.reminder.findMany({
      where: { jobId },
      orderBy: { remindAt: "asc" },
    });

    return successResponse(reminders, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const jobId = parseId(params.id);
    if (jobId === null) return errorResponse("INVALID_ID", "Invalid id");

    const job = await getJobById(jobId);
    if (!job) return errorResponse("NOT_FOUND", "Not found");
    if (job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    const body = await req.json().catch(() => ({}));
    const parsed = reminderSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

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

    return successResponse(reminder, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
