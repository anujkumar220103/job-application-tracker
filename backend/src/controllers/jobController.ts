// src/controllers/jobController.ts
const prisma = (await import('../lib/prisma.js')).default;

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

  await prisma.jobTimelineEvent.create({
    data: {
      jobId: job.id,
      type: "created",
      title: "Application added",
      description: `${job.company} - ${job.position}`,
      metadata: { status: job.status },
    },
  });

  return job;
}

export type JobQueryOptions = {
  search?: string;
  company?: string;
  location?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: "createdAt" | "company" | "position" | "location" | "status";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
};

/**
 * Returns a paginated, filtered, sorted list of jobs scoped to the given user.
 * All filtering/sorting/pagination is performed in the database. The query is
 * always scoped to userId server-side; the client cannot override ownership.
 */
export async function getAllJobs(userId: number | string, options?: JobQueryOptions) {
  const uid = typeof userId === "number" ? userId : Number(userId);

  if (!options) {
    // Backwards-compatible path: return the full list for this user.
    return prisma.job.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
    });
  }

  const where: Record<string, unknown> = { userId: uid };
  const and: unknown[] = [];

  if (options.search) {
    and.push({
      OR: [
        { company: { contains: options.search, mode: "insensitive" } },
        { position: { contains: options.search, mode: "insensitive" } },
        { location: { contains: options.search, mode: "insensitive" } },
      ],
    });
  }
  if (options.company) {
    and.push({ company: { contains: options.company, mode: "insensitive" } });
  }
  if (options.location) {
    and.push({ location: { contains: options.location, mode: "insensitive" } });
  }
  if (options.status) {
    where.status = options.status;
  }
  if (options.dateFrom || options.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (options.dateFrom) createdAt.gte = new Date(options.dateFrom);
    if (options.dateTo) createdAt.lte = new Date(options.dateTo);
    where.createdAt = createdAt;
  }
  if (and.length > 0) {
    where.AND = and;
  }

  const skip = (options.page - 1) * options.limit;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { [options.sortBy]: options.sortOrder },
      skip,
      take: options.limit,
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total };
}

export async function getJobById(id: number | string) {
  const nid = typeof id === "number" ? id : Number(id);
  const job = await prisma.job.findUnique({ where: { id: nid } });
  return job; // might be null
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Finds a likely-duplicate job for the given user based on normalized
 * (case-insensitive, whitespace-collapsed) company + position. Optionally
 * excludes a job id (used on edit so a job is not a duplicate of itself).
 * Scoped to userId; never compares across users. Returns the existing job or null.
 */
export async function findDuplicateJob(
  userId: number | string,
  input: { company: string; position: string; link?: string },
  excludeId?: number,
) {
  const uid = typeof userId === "number" ? userId : Number(userId);
  const company = normalize(input.company);
  const position = normalize(input.position);

  // Narrow in the DB by case-insensitive company (uses the userId index),
  // then confirm normalized company+position equality in code to also handle
  // internal whitespace differences.
  const candidates = await prisma.job.findMany({
    where: {
      userId: uid,
      company: { equals: input.company.trim(), mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const normalizedLink = input.link ? normalize(input.link) : "";

  const match = candidates.find((job) => {
    const sameCompany = normalize(job.company) === company;
    const samePosition = normalize(job.position) === position;
    if (sameCompany && samePosition) return true;
    // Secondary signal: same normalized non-empty link under the same company.
    if (sameCompany && normalizedLink && job.link && normalize(job.link) === normalizedLink) return true;
    return false;
  });

  return match ?? null;
}

export async function updateJob(id: number | string, update: Partial<Omit<CreateJobInput, "userId">>) {
  const nid = typeof id === "number" ? id : Number(id);

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

  if (update.status && update.status !== existing.status) {
    await prisma.jobTimelineEvent.create({
      data: {
        jobId: nid,
        type: "status_changed",
        title: `Status updated to ${update.status}`,
        description: `${existing.company} - ${existing.position}`,
        metadata: { previousStatus: existing.status, newStatus: update.status },
      },
    });
  }

  return updated;
}

export async function deleteJob(id: number | string) {
  const nid = typeof id === "number" ? id : Number(id);

  const existing = await prisma.job.findUnique({ where: { id: nid } });
  if (!existing) throw { status: 404, message: "Job not found" };

  await prisma.job.delete({ where: { id: nid } });
  return { message: "Deleted" };
}
