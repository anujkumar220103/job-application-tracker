import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

// Ensure a JWT secret is present for token signing.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-value-for-vitest-only";

import { loginUser } from "@/controllers/authController";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login does not reveal whether an email exists (enumeration)", () => {
  it("unknown email throws the generic invalid-credentials error", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(loginUser({ email: "nobody@example.com", password: "whatever123" })).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });

  it("wrong password throws the SAME generic error as unknown email", async () => {
    // Password hash that will not match the supplied password.
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: "real@example.com",
      name: "Real",
      password: "$2b$10$dhVaAReu.7B/.UID.HoYJ.cVtJaXQ8GROeChhVWHDAECZFppLcOwO",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(loginUser({ email: "real@example.com", password: "wrong-password" })).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });
});
