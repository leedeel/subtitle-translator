// Health check and info routes

import { Router, Request, Response } from "express";
import { getCacheStats } from "../lib/translation";
import { asyncHandler } from "../middleware";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  })
);

router.get(
  "/info",
  asyncHandler(async (_req: Request, res: Response) => {
    const cacheStats = getCacheStats();

    res.json({
      status: "ok",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      cache: cacheStats,
      features: {
        batchTranslation: true,
        progressTracking: true,
        fileUpload: true,
        subtitleFormats: ["srt", "vtt", "ass", "lrc"],
        llmProviders: true,
      },
    });
  })
);

export default router;