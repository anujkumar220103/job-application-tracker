import { getJobById, updateJob, deleteJob, findDuplicateJob } from "@/controllers/jobController";
import { getUserFromRequest } from "@/lib/auth";
import { updateJobSchema } from "@/lib/validation";
import { successResponse, errorResponse, validationError, handleRouteError } from "@/lib/responseHandler";

function parseId(id: unknown): number | null {
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return errorResponse("INVALID_ID", "Invalid id");

    const job = await getJobById(id);
    if (!job) return errorResponse("NOT_FOUND", "Not found");
    if (job.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    return successResponse(job, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return errorResponse("INVALID_ID", "Invalid id");

    const body = await req.json().catch(() => ({}));

    const existing = await getJobById(id);
    if (!existing) return errorResponse("NOT_FOUND", "Not found");
    if (existing.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Phase 4: if the edit changes company/position, block it when it would
    // collide with another of this user's jobs (excluding this job itself).
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
        return errorResponse(
          "DUPLICATE_APPLICATION",
          "A similar application already exists.",
          { existingJobId: duplicate.id, company: duplicate.company, position: duplicate.position, status: duplicate.status },
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

    const existing = await getJobById(id);
    if (!existing) return errorResponse("NOT_FOUND", "Not found");
    if (existing.userId !== user.id) return errorResponse("FORBIDDEN", "Forbidden");

    await deleteJob(id);
    return successResponse({ message: "Deleted" }, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
