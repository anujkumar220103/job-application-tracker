import { Router } from "express";
import { getUserFromAuthHeader } from "../lib/auth.js";
import { analyticsQuerySchema } from "../lib/validation.js";
import {
  successResponse,
  errorResponse,
  validationError,
  handleRouteError,
} from "../lib/responseHandler.js";
import { send, authHeaderOf } from "../lib/httpAdapter.js";

export const analyticsRouter = Router();

// GET /api/analytics
analyticsRouter.get("/", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(authHeaderOf(req));
    if (!user) return send(res, errorResponse("UNAUTHORIZED", "Unauthorized"));

    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) return send(res, validationError(parsed.error));

    const { getAnalytics } = await import("../controllers/analyticsController.js");
    const data = await getAnalytics(user.id, parsed.data.range);

    return send(res, successResponse(data, 200));
  } catch (err) {
    return send(res, handleRouteError(err));
  }
});
