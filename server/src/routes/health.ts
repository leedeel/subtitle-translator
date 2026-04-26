// Health check and info routes

import { Router, Request, Response } from "express";
import { getCacheStats } from "../lib/translation";
import { asyncHandler } from "../middleware";

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /health/info:
 *   get:
 *     tags: [Health]
 *     summary: Server information
 *     description: Returns detailed information about the server including cache stats and available features
 *     responses:
 *       200:
 *         description: Server information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   example: development
 *                 cache:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: number
 *                     maxSize:
 *                       type: number
 *                 features:
 *                   type: object
 *                   properties:
 *                     batchTranslation:
 *                       type: boolean
 *                     progressTracking:
 *                       type: boolean
 *                     fileUpload:
 *                       type: boolean
 *                     subtitleFormats:
 *                       type: array
 *                       items:
 *                         type: string
 *                     llmProviders:
 *                       type: boolean
 */
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