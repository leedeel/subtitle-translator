// File upload API routes

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
 * components:
 *   schemas:
 *     UploadFileRequest:
 *       type: object
 *       properties:
 *         fileType:
 *           type: string
 *           enum: [srt, vtt, ass, lrc]
 *           description: Optional file type override
 *     UploadFileResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         fileType:
 *           type: string
 *           enum: [srt, vtt, ass, lrc]
 *         contentLines:
 *           type: array
 *           items:
 *             type: string
 *         totalLines:
 *           type: integer
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload subtitle file
 *     description: Upload and parse a subtitle file. Automatically detects format unless fileType is specified.
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
 *                 description: Subtitle file (SRT, VTT, ASS, or LRC format)
 *               fileType:
 *                 type: string
 *                 enum: [srt, vtt, ass, lrc]
 *                 description: Optional file type override
 *     responses:
 *       200:
 *         description: File processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadFileResponse'
 *       400:
 *         description: Bad request (no file or invalid format)
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

/**
 * @swagger
 * /upload/bilingual:
 *   post:
 *     tags: [Upload]
 *     summary: Generate bilingual subtitle file
 *     description: Generate a bilingual subtitle file from original and translated lines
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
 *                 description: Original subtitle lines
 *               translatedLines:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Translated subtitle lines
 *               fileType:
 *                 type: string
 *                 enum: [srt, vtt, ass, lrc]
 *                 description: Output file format
 *               bilingualSubtitle:
 *                 type: boolean
 *                 description: Force bilingual ASS output
 *     responses:
 *       200:
 *         description: Bilingual subtitle file
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
}

export default router;