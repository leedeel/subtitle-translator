// Health check and info routes / 健康检查和信息路由

import { Router, Request, Response } from "express";
import { getCacheStats } from "../lib/translation";
import { asyncHandler } from "../middleware";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: 健康检查
 *     description: 返回 API 的健康状态
 *     responses:
 *       200:
 *         description: API 运行正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                   description: 健康状态
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 时间戳
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
 * /api/health/info:
 *   get:
 *     tags: [Health]
 *     summary: 服务器信息
 *     description: 返回服务器的详细信息，包括缓存统计和可用功能
 *     responses:
 *       200:
 *         description: 服务器信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                   description: 状态
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                   description: 版本号
 *                 environment:
 *                   type: string
 *                   example: development
 *                   description: 环境变量
 *                 cache:
 *                   type: object
 *                   description: 缓存信息
 *                   properties:
 *                     size:
 *                       type: number
 *                       description: 当前缓存大小
 *                     maxSize:
 *                       type: number
 *                       description: 最大缓存大小
 *                 features:
 *                   type: object
 *                   description: 功能列表
 *                   properties:
 *                     batchTranslation:
 *                       type: boolean
 *                       description: 批量翻译
 *                     progressTracking:
 *                       type: boolean
 *                       description: 进度跟踪
 *                     fileUpload:
 *                       type: boolean
 *                       description: 文件上传
 *                     subtitleFormats:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 支持的字幕格式
 *                     llmProviders:
 *                       type: boolean
 *                       description: LLM 提供商支持
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