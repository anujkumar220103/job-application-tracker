// src/controllers/jobController.ts
import { prisma } from "@/lib/prisma";

export type CreateJobInput = {
  company: string;
  position: string;
  location: string;
  status: string;
  link: string;
  userId: number | string;
};

export async function createJob(input: CreateJobInput) {
  const userId = typeof input.userId === "number" ? input.userId : Number(input.userId);

  const job = await prisma.job.create({
    data: {
      userId,
      company: input.company,
      position: input.position,
      location: input.location,
      status: input.status,
      link: input.link,
    },
  });

  return job;
}

export async function getAllJobs(userId: number | string) {
  const uid = typeof userId === "number" ? userId : Number(userId);

  const jobs = await prisma.job.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
  });

  return jobs;
}

export async function getJobById(id: number | string) {
  const nid = typeof id === "number" ? id : Number(id);
  const job = await prisma.job.findUnique({ where: { id: nid } });
  return job; // might be null
}

export async function updateJob(id: number | string, update: Partial<Omit<CreateJobInput, "userId">>) {
  const nid = typeof id === "number" ? id : Number(id);

  // Optionally check existence first
  const existing = await prisma.job.findUnique({ where: { id: nid } });
  if (!existing) throw { status: 404, message: "Job not found" };

  const updated = await prisma.job.update({
    where: { id: nid },
    data: {
      company: update.company ?? existing.company,
      position: update.position ?? existing.position,
      location: update.location ?? existing.location,
      status: update.status ?? existing.status,
      link: update.link ?? existing.link,
    },
  });

  return updated;
}

export async function deleteJob(id: number | string) {
  const nid = typeof id === "number" ? id : Number(id);

  const existing = await prisma.job.findUnique({ where: { id: nid } });
  if (!existing) throw { status: 404, message: "Job not found" };

  await prisma.job.delete({ where: { id: nid } });
  return { message: "Deleted" };
}
