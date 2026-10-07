// src/controllers/authController.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/env";

type RegisterInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };

export async function registerUser(input: RegisterInput) {
  // lazy import prisma inside function to avoid module-level side effects
  const prisma = (await import('@/lib/prisma')).default;

  const { name, email, password } = input;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw { status: 409, code: "CONFLICT", message: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { message: "User registered successfully", user: safeUser };
}

export async function loginUser(input: LoginInput) {
  const prisma = (await import('@/lib/prisma')).default;

  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });

  // Prevent user enumeration: unknown email and wrong password return the
  // same error. Still run a bcrypt comparison to reduce timing differences.
  const invalidCredentials = { status: 401, code: "INVALID_CREDENTIALS", message: "Invalid email or password" };
  // Constant, valid bcrypt hash used only to equalize timing when the email
  // is unknown. It is not a real credential.
  const DUMMY_HASH = "$2b$10$dhVaAReu.7B/.UID.HoYJ.cVtJaXQ8GROeChhVWHDAECZFppLcOwO";

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalidCredentials;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw invalidCredentials;

  const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: "7d",
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { message: "Login successful", user: safeUser, token };
}
