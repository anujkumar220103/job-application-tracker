import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { success, error } from "../utils/responseHandler";
import { AuthRequest } from "../middlewares/authMiddleware";

const prisma = new PrismaClient();

// ✅ Create a new job
interface JobBody {
  company: string;
  position: string;
  location: string;
  status: string;
  link: string;
}

export const createJob = async (req: AuthRequest, res: Response) => {
  try {
    const { company, position, location, status, link } = req.body;
    const userId=req.user?.id;
    const job = await prisma.job.create({
      data: { userId,company, position, location, status, link },
    });

    return success(res, job, "Job added successfully ✅");
  } catch (err) {
    console.error(err);
    return error(res, "Failed to add job");
  }
};


// ✅ Get all jobs
export const getAllJobs = async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      where:{userId:req.user?.id}
    });

    return success(res, jobs, "Jobs fetched successfully");
  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch jobs");
  }
};

// ✅ Get single job by ID
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({ where: { id: Number(id) } });
    if (!job) return error(res, "Job not found", 404);

    return success(res, job, "Job fetched successfully");
  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch job");
  }
};

// ✅ Update job
export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { company, position, location, status, link } = req.body;

    const job = await prisma.job.update({
      where: { id: Number(id) },
      data: { company, position, location, status, link },
    });

    return success(res, job, "Job updated successfully");
  } catch (err) {
    console.error(err);
    return error(res, "Failed to update job");
  }
};

// ✅ Delete job
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.job.delete({ where: { id: Number(id) } });

    return success(res, null, "Job deleted successfully");
  } catch (err) {
    console.error(err);
    return error(res, "Failed to delete job");
  }
};
