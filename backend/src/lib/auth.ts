// src/lib/auth.ts
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./env.js";

/**
 * Resolves the authenticated user from an Authorization header value.
 * JWT verification and payload handling are identical to the original
 * Next.js implementation; only the input shape changed from a Web `Request`
 * to the raw header string so it can be used from Express.
 */
export async function getUserFromAuthHeader(authHeader: string | undefined | null) {
  const prisma = (await import("./prisma.js")).default;

  const header = authHeader || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    const id = typeof payload.id === "number" ? payload.id : Number(payload.id);
    if (!Number.isInteger(id)) return null;
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } catch {
    return null;
  }
}
