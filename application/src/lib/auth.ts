// src/lib/auth.ts
import jwt from "jsonwebtoken";
import { JwtPayload, Secret } from "jsonwebtoken";

const prisma = (await import('@/lib/prisma')).default;

const JWT_SECRET = process.env.JWT_SECRET as Secret;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const id = typeof payload.id === "number" ? payload.id : Number(payload.id);
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } catch {
    return null;
  }
}
