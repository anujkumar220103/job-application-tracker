import { getUserFromRequest } from "@/lib/auth";
import { getJobById } from "@/controllers/jobController";
import prisma from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";
import { interviewSchema } from "@/lib/validation";
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

    const interviews = await prisma.interview.findMany({
      where: { jobId },
      orderBy: { dateTime: "asc" },
    });

    return successResponse(interviews, 200);
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
    const parsed = interviewSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

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

    return successResponse(interview, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
