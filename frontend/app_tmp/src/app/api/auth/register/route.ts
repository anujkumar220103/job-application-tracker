import { registerSchema } from "@/lib/validation";
import { successResponse, validationError, handleRouteError } from "@/lib/responseHandler";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { registerUser } = await import("@/controllers/authController");
    const result = await registerUser(parsed.data);
    return successResponse(result, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
