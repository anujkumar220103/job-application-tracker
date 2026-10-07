import { getUserFromRequest } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/validation";
import { successResponse, errorResponse, validationError, handleRouteError } from "@/lib/responseHandler";

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const url = new URL(req.url);
    const parsed = analyticsQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return validationError(parsed.error);

    const { getAnalytics } = await import("@/controllers/analyticsController");
    const data = await getAnalytics(user.id, parsed.data.range);

    return successResponse(data, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
