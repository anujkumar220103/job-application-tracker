import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUserFromRequest, mockRegisterUser, mockLoginUser } = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockRegisterUser: vi.fn(),
  mockLoginUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromRequest: mockGetUserFromRequest,
}));

vi.mock("@/controllers/authController", () => ({
  registerUser: mockRegisterUser,
  loginUser: mockLoginUser,
}));

import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as createJobPost } from "@/app/api/jobs/route";

describe("auth API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("missing JWT is rejected for a protected endpoint", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await createJobPost(new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "https://example.com" }),
    }));

    expect(response.status).toBe(401);
  });

  it("invalid JWT is rejected", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await createJobPost(new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "https://example.com" }),
    }));

    expect(response.status).toBe(401);
  });

  it("expired JWT is rejected", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await createJobPost(new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { Authorization: "Bearer expired-token", "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Acme", position: "Engineer", location: "Remote", status: "applied", link: "https://example.com" }),
    }));

    expect(response.status).toBe(401);
  });

  it("malformed register request is rejected", async () => {
    mockRegisterUser.mockResolvedValue({});

    const response = await registerPost(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: "bad-email", password: "short" }),
    }));

    expect(response.status).toBe(422);
  });

  it("malformed login request is rejected", async () => {
    mockLoginUser.mockResolvedValue({});

    const response = await loginPost(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad-email", password: "" }),
    }));

    expect(response.status).toBe(422);
  });
});
