import { Router } from "express";
import { registerSchema, loginSchema } from "../lib/validation.js";
import { getUserFromAuthHeader } from "../lib/auth.js";
import {
  successResponse,
  errorResponse,
  validationError,
  handleRouteError,
} from "../lib/responseHandler.js";
import { send, authHeaderOf } from "../lib/httpAdapter.js";

export const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const body = req.body ?? {};
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const { registerUser } = await import("../controllers/authController.js");
    const result = await registerUser(parsed.data);
    return send(res, successResponse(result, 201));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const body = req.body ?? {};
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const { loginUser } = await import("../controllers/authController.js");
    const result = await loginUser(parsed.data);
    return send(res, successResponse(result, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});

// GET /api/auth/me
authRouter.get("/me", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return send(res, successResponse({ user: safeUser }, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});
