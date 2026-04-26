// Job management API routes

import { Router, Request, Response } from "express";
import type { JobStatusResponse } from "../types";
import { asyncHandler } from "../middleware";

const router = Router();

const jobs = new Map<string, {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: string[];
  error?: string;
  createdAt: number;
  completedAt?: number;
}>();

export const createJob = (data: Omit<JobStatusResponse, "jobId">): string => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  jobs.set(jobId, {
    ...data,
  });
  return jobId;
};

export const updateJob = (jobId: string, updates: Partial<Omit<JobStatusResponse, "jobId">>): void => {
  const job = jobs.get(jobId);
  if (job) {
    jobs.set(jobId, { ...job, ...updates });
  }
};

export const getJob = (jobId: string): JobStatusResponse | undefined => {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  return {
    jobId,
    ...job,
  };
};

export const deleteJob = (jobId: string): boolean => {
  return jobs.delete(jobId);
};

router.get(
  "/:jobId",
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: "Job not found",
      });
      return;
    }

    res.json({
      success: true,
      ...job,
    });
  })
);

router.delete(
  "/:jobId",
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const deleted = deleteJob(jobId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: "Job not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Job deleted successfully",
    });
  })
);

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const jobList = Array.from(jobs.entries()).map(([jobId, job]) => ({
      jobId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    }));

    res.json({
      success: true,
      jobs: jobList,
    });
  })
);

const cleanupOldJobs = (): void => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo && (job.status === "completed" || job.status === "failed")) {
      jobs.delete(jobId);
    }
  }
};

setInterval(cleanupOldJobs, 600000);

export default router;