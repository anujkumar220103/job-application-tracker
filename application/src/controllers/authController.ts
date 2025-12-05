// src/controllers/authController.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set in env");

type RegisterInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };

export async function registerUser(input: RegisterInput) {
  const { name, email, password } = input;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw { status: 400, message: "Email already in use" };
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
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { status: 404, message: "User not found" };

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw { status: 401, message: "Invalid credentials" };

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { message: "Login successful", user: safeUser, token };
}
