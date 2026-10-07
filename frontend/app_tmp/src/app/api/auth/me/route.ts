// src/app/api/auth/me/route.ts
import { getUserFromRequest } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/responseHandler";

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized");

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return successResponse({ user: safeUser }, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
