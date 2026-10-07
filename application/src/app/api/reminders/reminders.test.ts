import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetJobById, prismaMock, mockAddTimelineEvent } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetJobById: vi.fn(),
  mockAddTimelineEvent: vi.fn().mockResolvedValue(undefined),
  prismaMock: {
    reminder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    job: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getUserFromRequest: mockGetUser }));
vi.mock("@/controllers/jobController", () => ({ getJobById: mockGetJobById }));
vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/timeline", async (orig) => {
  const actual = await orig<typeof import("@/lib/timeline")>();
  return { ...actual, addTimelineEvent: mockAddTimelineEvent };
});

import { GET as listReminders, POST as createReminder } from "@/app/api/jobs/[id]/reminders/route";
import { PUT as updateReminder, DELETE as deleteReminder } from "@/app/api/reminders/[id]/route";

const OWNER = { id: 7 };
const JOB = { id: 10, userId: 7 };

function authReq(url: string, method = "GET", body?: unknown) {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue(OWNER);
  mockGetJobById.mockResolvedValue(JOB);
  prismaMock.job.findUnique.mockResolvedValue(JOB);
});

describe("Reminder CRUD + ownership (Phase 3)", () => {
  it("rejects unauthenticated list", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await listReminders(authReq("http://x/api/jobs/10/reminders"), { params: { id: "10" } });
    expect(res.status).toBe(401);
  });

  it("blocks listing another user's reminders", async () => {
    mockGetJobById.mockResolvedValue({ ...JOB, userId: 99 });
    const res = await listReminders(authReq("http://x/api/jobs/10/reminders"), { params: { id: "10" } });
    expect(res.status).toBe(403);
  });

  it("lists reminders for the owner", async () => {
    prismaMock.reminder.findMany.mockResolvedValue([{ id: 1 }]);
    const res = await listReminders(authReq("http://x/api/jobs/10/reminders"), { params: { id: "10" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates a reminder and writes reminder_created", async () => {
    prismaMock.reminder.create.mockResolvedValue({ id: 3, title: "Follow up" });
    const res = await createReminder(
      authReq("http://x/api/jobs/10/reminders", "POST", { title: "Follow up", remindAt: new Date().toISOString() }),
      { params: { id: "10" } },
    );
    expect(res.status).toBe(201);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "reminder_created" }));
  });

  it("rejects invalid reminder payload", async () => {
    const res = await createReminder(
      authReq("http://x/api/jobs/10/reminders", "POST", { title: "", remindAt: "nope" }),
      { params: { id: "10" } },
    );
    expect(res.status).toBe(422);
  });

  it("completing a reminder writes reminder_completed", async () => {
    prismaMock.reminder.findUnique.mockResolvedValue({ id: 3, jobId: 10, title: "Follow up" });
    prismaMock.reminder.update.mockResolvedValue({ id: 3, jobId: 10, title: "Follow up", completed: true });
    const res = await updateReminder(
      authReq("http://x/api/reminders/3", "PUT", { completed: true }),
      { params: { id: "3" } },
    );
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "reminder_completed" }));
  });

  it("a non-completion update writes reminder_updated", async () => {
    prismaMock.reminder.findUnique.mockResolvedValue({ id: 3, jobId: 10, title: "Follow up" });
    prismaMock.reminder.update.mockResolvedValue({ id: 3, jobId: 10, title: "Follow up again" });
    const res = await updateReminder(
      authReq("http://x/api/reminders/3", "PUT", { title: "Follow up again" }),
      { params: { id: "3" } },
    );
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "reminder_updated" }));
  });

  it("blocks updating another user's reminder", async () => {
    prismaMock.reminder.findUnique.mockResolvedValue({ id: 3, jobId: 10 });
    prismaMock.job.findUnique.mockResolvedValue({ id: 10, userId: 99 });
    const res = await updateReminder(
      authReq("http://x/api/reminders/3", "PUT", { completed: true }),
      { params: { id: "3" } },
    );
    expect(res.status).toBe(403);
    expect(prismaMock.reminder.update).not.toHaveBeenCalled();
  });

  it("deletes a reminder and writes reminder_deleted", async () => {
    prismaMock.reminder.findUnique.mockResolvedValue({ id: 3, jobId: 10, title: "Follow up" });
    prismaMock.reminder.delete.mockResolvedValue({ id: 3 });
    const res = await deleteReminder(authReq("http://x/api/reminders/3", "DELETE"), { params: { id: "3" } });
    expect(res.status).toBe(200);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "reminder_deleted" }));
  });

  it("blocks deleting another user's reminder", async () => {
    prismaMock.reminder.findUnique.mockResolvedValue({ id: 3, jobId: 10 });
    prismaMock.job.findUnique.mockResolvedValue({ id: 10, userId: 99 });
    const res = await deleteReminder(authReq("http://x/api/reminders/3", "DELETE"), { params: { id: "3" } });
    expect(res.status).toBe(403);
    expect(prismaMock.reminder.delete).not.toHaveBeenCalled();
  });
});
