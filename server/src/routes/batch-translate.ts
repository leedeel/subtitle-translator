// Batch translation API routes

import { Router, Request, Response } from "express";
import { generateCacheSuffix, getDefaultConfig, LLM_MODELS } from "../lib/translation";
import { batchTranslate, batchTranslateWithContext, isAuthError } from "../lib/batch-translate";
import type { BatchTranslateRequest, BatchTranslateResponse, JobStatusResponse } from "../types";
import { asyncHandler } from "../middleware";

const router = Router();

/**
 * @swagger
 * /batch-translate:
 *   post:
 *     tags: [Batch Translation]
 *     summary: Batch translate texts
 *     description: Translate multiple texts with optional progress tracking. Set enableProgress to true for async processing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchTranslateRequest'
 *     responses:
 *       200:
 *         description: Translation completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchTranslateResponse'
 *       202:
 *         description: Translation started (async mode)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobId:
 *                   type: string
 *                   description: Job ID for tracking progress
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Job storage (in-memory for demo, use Redis/database in production)
const jobs = new Map<string, {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  results?: string[];
  errors?: Array<{ index: number; error: string }>;
  error?: string;
  createdAt: number;
  completedAt?: number;
}>();

// Batch translate with progress tracking
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as BatchTranslateRequest;
    const { texts, targetLanguage, sourceLanguage = "auto", translationMethod, config = {}, useCache = true, enableProgress = false } = body;

    const defaultConfig = getDefaultConfig(translationMethod);
    const mergedConfig = { ...defaultConfig, ...config };

    const cacheSuffix = generateCacheSuffix(
      sourceLanguage,
      targetLanguage,
      translationMethod,
      {
        model: mergedConfig.model,
        temperature: mergedConfig.temperature,
        sysPrompt: mergedConfig.sysPrompt,
        userPrompt: mergedConfig.userPrompt,
      }
    );

    const maxConcurrent = config.maxConcurrent || Number.parseInt(process.env.MAX_CONCURRENT_REQUESTS || "10", 10);
    const maxBatchSize = Number.parseInt(process.env.MAX_BATCH_SIZE || "50", 10);

    if (enableProgress) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      jobs.set(jobId, {
        status: "pending",
        progress: 0,
        createdAt: Date.now(),
      });

      res.json({
        success: true,
        jobId,
      });

      processBatchTranslateAsync(jobId, texts, translationMethod, {
        targetLanguage,
        sourceLanguage,
        cacheSuffix,
        useCache,
        apiKey: mergedConfig.apiKey,
        region: mergedConfig.region,
        url: mergedConfig.url,
        model: mergedConfig.model,
        apiVersion: mergedConfig.apiVersion,
        temperature: mergedConfig.temperature,
        sysPrompt: mergedConfig.sysPrompt,
        userPrompt: mergedConfig.userPrompt,
        useRelay: mergedConfig.useRelay,
        enableThinking: mergedConfig.enableThinking,
        domains: mergedConfig.domains,
      }, maxConcurrent, maxBatchSize, mergedConfig.batchSize, mergedConfig.contextWindow);

      return;
    }

    const isLLM = LLM_MODELS.includes(translationMethod);
    const shouldUseContext = isLLM && texts.length > 1;

    const { results, errors } = shouldUseContext
      ? await batchTranslateWithContext({
          texts,
          translationMethod,
          params: {
            targetLanguage,
            sourceLanguage,
            cacheSuffix,
            useCache,
            apiKey: mergedConfig.apiKey,
            region: mergedConfig.region,
            url: mergedConfig.url,
            model: mergedConfig.model,
            apiVersion: mergedConfig.apiVersion,
            temperature: mergedConfig.temperature,
            sysPrompt: mergedConfig.sysPrompt,
            userPrompt: mergedConfig.userPrompt,
            useRelay: mergedConfig.useRelay,
            enableThinking: mergedConfig.enableThinking,
            domains: mergedConfig.domains,
          },
          batchSize: mergedConfig.batchSize,
          contextWindow: mergedConfig.contextWindow,
          maxConcurrent,
          onProgress: (completed, total) => {
            console.log(`Progress: ${completed}/${total}`);
          },
        })
      : await batchTranslate({
          texts,
          translationMethod,
          params: {
            targetLanguage,
            sourceLanguage,
            cacheSuffix,
            useCache,
            apiKey: mergedConfig.apiKey,
            region: mergedConfig.region,
            url: mergedConfig.url,
            model: mergedConfig.model,
            apiVersion: mergedConfig.apiVersion,
            temperature: mergedConfig.temperature,
            sysPrompt: mergedConfig.sysPrompt,
            userPrompt: mergedConfig.userPrompt,
            useRelay: mergedConfig.useRelay,
            enableThinking: mergedConfig.enableThinking,
            domains: mergedConfig.domains,
          },
          maxConcurrent,
        });

    const response: BatchTranslateResponse = {
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };

    res.json(response);
  })
);

// Get job status
router.get(
  "/jobs/:jobId",
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: "Job not found",
      });
      return;
    }

    const response: JobStatusResponse = {
      jobId,
      status: job.status,
      progress: job.progress,
      result: job.results,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /batch-translate/jobs/{jobId}:
 *   get:
 *     tags: [Batch Translation]
 *     summary: Get batch translation job status
 *     description: Check the status of an async batch translation job
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID returned from batch translate request
 *     responses:
 *       200:
 *         description: Job status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobStatusResponse'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Clean up old jobs (older than 1 hour)
const cleanupOldJobs = (): void => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo && (job.status === "completed" || job.status === "failed")) {
      jobs.delete(jobId);
    }
  }
};

setInterval(cleanupOldJobs, 600000);

async function processBatchTranslateAsync(
  jobId: string,
  texts: string[],
  translationMethod: string,
  params: {
    targetLanguage: string;
    sourceLanguage: string;
    cacheSuffix: string;
    useCache: boolean;
    apiKey?: string;
    region?: string;
    url?: string;
    model?: string;
    apiVersion?: string;
    temperature?: number;
    sysPrompt?: string;
    userPrompt?: string;
    useRelay?: boolean;
    enableThinking?: boolean;
    domains?: string;
  },
  maxConcurrent: number,
  maxBatchSize: number,
  batchSize?: number,
  contextWindow?: number
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "processing";
  job.progress = 0;

  try {
    const isLLM = LLM_MODELS.includes(translationMethod);
    const shouldUseContext = isLLM && texts.length > 1;

    const { results, errors } = shouldUseContext
      ? await batchTranslateWithContext({
          texts,
          translationMethod,
          params,
          maxConcurrent,
          batchSize,
          contextWindow,
          onProgress: (completed, total) => {
            const currentJob = jobs.get(jobId);
            if (currentJob) {
              currentJob.progress = Math.round((completed / total) * 100);
            }
          },
        })
      : await batchTranslate({
          texts,
          translationMethod,
          params,
          maxConcurrent,
          onProgress: (completed, total) => {
            const currentJob = jobs.get(jobId);
            if (currentJob) {
              currentJob.progress = Math.round((completed / total) * 100);
            }
          },
        });

    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.status = "completed";
      currentJob.progress = 100;
      currentJob.results = results;
      currentJob.errors = errors.length > 0 ? errors : undefined;
      currentJob.completedAt = Date.now();
    }
  } catch (error) {
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      currentJob.status = "failed";
      currentJob.error = error instanceof Error ? error.message : "Unknown error";
      currentJob.completedAt = Date.now();
    }
    console.error(`Batch translation failed for job ${jobId}:`, error);
  }
}

export default router;