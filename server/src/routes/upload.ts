// File upload API routes / 文件上传 API 路由

import { Router, Request, Response } from "express";
import multer from "multer";
import { detectSubtitleFormat, filterSubLines, assHeader } from "../lib/subtitle";
import type { UploadFileResponse } from "../types";
import { asyncHandler } from "../middleware";
import { readEncoding } from "../lib/utils/encoding";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const router = Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: 上传字幕文件
 *     description: 上传并解析字幕文件。自动检测格式，除非指定了 fileType
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 字幕文件（SRT、VTT、ASS 或 LRC 格式）
 *               fileType:
 *                 type: string
 *                 enum: [srt, vtt, ass, lrc]
 *                 description: 可选的文件类型覆盖
 *     responses:
 *       200:
 *         description: 文件处理成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadFileResponse'
 *       400:
 *         description: 请求错误（无文件或格式无效）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Upload subtitle file
router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
      return;
    }

    const buffer = req.file.buffer;
    const originalname = req.file.originalname || "";
    const body = req.body as Partial<UploadFileRequest>;

    try {
      const encoding = await readEncoding(buffer);
      const content = buffer.toString(encoding);
      const lines = content.split(/\r?\n/);

      const fileType = body.fileType || detectSubtitleFormat(lines);

      if (fileType === "error") {
        res.status(400).json({
          success: false,
          error: "Unable to detect subtitle file format. Supported formats: SRT, VTT, ASS, LRC",
        });
        return;
      }

      const { contentLines, contentIndices, assContentStartIndex } = filterSubLines(lines, fileType);

      const response: UploadFileResponse = {
        success: true,
        fileType,
        contentLines,
        totalLines: contentLines.length,
      };

      res.json(response);
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process file",
      });
    }
  })
);

/**
 * @swagger
 * /api/upload/bilingual:
 *   post:
 *     tags: [Upload]
 *     summary: 生成双语字幕文件
 *     description: 根据原文和译文行生成双语字幕文件
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalLines
 *               - translatedLines
 *             properties:
 *               originalLines:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 原始字幕行
 *               translatedLines:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 翻译后的字幕行
 *               fileType:
 *                 type: string
 *                 enum: [srt, vtt, ass, lrc]
 *                 description: 输出文件格式
 *               bilingualSubtitle:
 *                 type: boolean
 *                 description: 强制双语 ASS 输出
 *     responses:
 *       200:
 *         description: 双语字幕文件
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       400:
 *         description: 请求错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Generate bilingual subtitle file
router.post(
  "/bilingual",
  asyncHandler(async (req: Request, res: Response) => {
    const { originalLines, translatedLines, fileType, bilingualSubtitle } = req.body;

    if (!originalLines || !translatedLines) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: originalLines and translatedLines",
      });
      return;
    }

    if (originalLines.length !== translatedLines.length) {
      res.status(400).json({
        success: false,
        error: "Original and translated line counts must match",
      });
      return;
    }

    let output = "";

    if (bilingualSubtitle || fileType === "ass") {
      const { prepareAssForTranslation, restoreAssAfterTranslation, convertTimeToAss } = await import("../lib/subtitle");
      const { cleanLines: cleanOriginal, tagMaps: originalTags } = prepareAssForTranslation(originalLines);
      const { cleanLines: cleanTranslated, tagMaps: translatedTags } = prepareAssForTranslation(translatedLines);

      const bilingualLines = cleanOriginal.map((orig, i) => {
        const origTag = originalTags[i]?.leadingTags || "";
        const transTag = translatedTags[i]?.leadingTags || "";
        return `${origTag}${orig}\N${transTag}${cleanTranslated[i]}`;
      });

      output = assHeader + "\n";
      bilingualLines.forEach((line) => {
        output += `Dialogue: 0,0:00:00.00,0:00:05.00,Default,,${line}\n`;
      });
    } else if (fileType === "vtt") {
      output = "WEBVTT\n\n";
      originalLines.forEach((line, i) => {
        output += `${i + 1}\n00:00:00.000 --> 00:00:05.000\n${line}\n${translatedLines[i]}\n\n`;
      });
    } else if (fileType === "lrc") {
      originalLines.forEach((line, i) => {
        output += `[${formatTime(i)}]${line} / ${translatedLines[i]}\n`;
      });
    } else {
      originalLines.forEach((line, i) => {
        output += `${i + 1}\n00:00:00,000 --> 00:00:05,000\n${line}\n${translatedLines[i]}\n\n`;
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=bilingual_subtitles.txt");
    res.send(output);
  })
);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
}

export default router;