import { getAllJobs, createJob, findDuplicateJob, type JobQueryOptions } from "@/controllers/jobController";
import { getUserFromRequest } from "@/lib/auth";
import { createJobSchema, jobsQuerySchema } from "@/lib/validation";
import { successResponse, errorResponse, validationError, handleRouteError } from "@/lib/responseHandler";
import { DEFAULT_LIMIT } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const url = new URL(req.url);
    const rawQuery = Object.fromEntries(url.searchParams.entries());
    const parsed = jobsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) return validationError(parsed.error);

    const options: JobQueryOptions = parsed.data;
    const result = await getAllJobs(user.id, options);

    // getAllJobs returns { jobs, total } when options are supplied.
    const jobs = Array.isArray(result) ? result : result.jobs;
    const total = Array.isArray(result) ? result.length : result.total;
    const limit = options.limit || DEFAULT_LIMIT;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return successResponse(jobs, 200, {
      pagination: {
        page: options.page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const body = await req.json().catch(() => ({}));
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Phase 4: block likely-duplicate applications for this user.
    const duplicate = await findDuplicateJob(user.id, {
      company: parsed.data.company,
      position: parsed.data.position,
      link: parsed.data.link,
    });
    if (duplicate) {
      return errorResponse(
        "DUPLICATE_APPLICATION",
        "A similar application already exists.",
        { existingJobId: duplicate.id, company: duplicate.company, position: duplicate.position, status: duplicate.status },
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

    return successResponse(job, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
