import { getUserFromRequest } from "@/lib/auth";
import { getJobById } from "@/controllers/jobController";
import { getJobTimeline } from "@/lib/timeline";
import { successResponse, errorResponse, handleRouteError } from "@/lib/responseHandler";

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const jobId = Number(params.id);
    if (!Number.isInteger(jobId)) return errorResponse("INVALID_ID", "Invalid id");

    const job = await getJobById(jobId);
    if (!job) return errorResponse("NOT_FOUND", "Not found");
    if (job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    const items = await getJobTimeline(jobId);
    return successResponse(items, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
