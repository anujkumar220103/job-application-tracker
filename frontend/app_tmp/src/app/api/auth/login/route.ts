import { loginSchema } from "@/lib/validation";
import { successResponse, validationError, handleRouteError } from "@/lib/responseHandler";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { loginUser } = await import("@/controllers/authController");
    const result = await loginUser(parsed.data);
    return successResponse(result, 200);
  } catch (err) {
    return handleRouteError(err);
  }
}
