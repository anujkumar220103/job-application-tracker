// src/lib/auth.ts
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/env";

export async function getUserFromRequest(req: Request) {
  const prisma = (await import("@/lib/prisma")).default;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
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
