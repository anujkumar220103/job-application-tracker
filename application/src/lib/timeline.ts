import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type TimelineEventType =
  | "created"
  | "status_changed"
  | "interview_scheduled"
  | "interview_updated"
  | "interview_completed"
  | "interview_cancelled"
  | "interview_deleted"
  | "reminder_created"
  | "reminder_updated"
  | "reminder_deleted"
  | "reminder_completed";

export async function addTimelineEvent({
  jobId,
  type,
  title,
  description,
  metadata,
}: {
  jobId: number;
  type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const jsonMetadata = metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull;

  return prisma.jobTimelineEvent.create({
    data: {
      jobId,
      type,
      title,
      description: description ?? null,
      metadata: jsonMetadata,
    },
  });
}

export async function getJobTimeline(jobId: number) {
  return prisma.jobTimelineEvent.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
  });
}
