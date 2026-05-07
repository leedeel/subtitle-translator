// File upload API routes / 文件上传 API 路由

import { Router, Request, Response } from "express";
import multer from "multer";
import { detectSubtitleFormat, filterSubLines, assHeader, prepareAssForTranslation, restoreAssAfterTranslation } from "../lib/subtitle";
import { generateCacheSuffix, getDefaultConfig } from "../lib/translation";
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

/**
 * @swagger
 * /api/upload/translate:
 *   post:
 *     tags: [Upload]
 *     summary: 上传字幕文件并翻译成双语字幕
 *     description: 上传字幕文件，自动翻译并返回双语字幕文件
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - targetLanguage
 *               - translationMethod
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 字幕文件（SRT、VTT、ASS 或 LRC 格式）
 *               targetLanguage:
 *                 type: string
 *                 description: 目标语言代码（如 'en', 'zh', 'ja'）
 *               sourceLanguage:
 *                 type: string
 *                 description: 源语言代码（默认 auto）
 *               translationMethod:
 *                 type: string
 *                 description: 翻译服务/方法
 *               apiKey:
 *                 type: string
 *                 description: API 密钥
 *               fileType:
 *                 type: string
 *                 enum: [srt, vtt, ass, lrc]
 *                 description: 可选的文件类型覆盖
 *               bilingualPosition:
 *                 type: string
 *                 enum: [above, below]
 *                 description: 双语字幕位置（默认 below）
 *     responses:
 *       200:
 *         description: 翻译成功，返回双语字幕文件
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
 *       500:
 *         description: 翻译失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/translate",
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "未上传文件",
      });
      return;
    }

    const { targetLanguage, sourceLanguage = "auto", translationMethod, apiKey, fileType: fileTypeOption, bilingualPosition = "below" } = req.body;

    if (!targetLanguage || !translationMethod) {
      res.status(400).json({
        success: false,
        error: "缺少必填参数：targetLanguage 和 translationMethod",
      });
      return;
    }

    try {
      const buffer = req.file.buffer;
      const encoding = await readEncoding(buffer);
      const content = buffer.toString(encoding);
      const lines = content.split(/\r?\n/);

      const detectedFileType = fileTypeOption || detectSubtitleFormat(lines);

      if (detectedFileType === "error") {
        res.status(400).json({
          success: false,
          error: "无法检测字幕文件格式。支持的格式：SRT、VTT、ASS、LRC",
        });
        return;
      }

      const { contentLines, contentIndices, assContentStartIndex, styleBlockLines } = filterSubLines(lines, detectedFileType);

      if (contentLines.length === 0) {
        res.status(400).json({
          success: false,
          error: "字幕文件中没有可翻译的内容",
        });
        return;
      }

      // 处理 ASS 标签
      const isAss = detectedFileType === "ass";
      const { cleanLines, tagMaps } = isAss ? prepareAssForTranslation(contentLines) : { cleanLines: contentLines, tagMaps: [] };

      // 翻译所有内容行
      const { translate } = require("../lib/translation").useTranslation();
      const defaultConfig = getDefaultConfig(translationMethod);

      const cacheSuffix = generateCacheSuffix(
        sourceLanguage,
        targetLanguage,
        translationMethod,
        {
          model: defaultConfig.model,
          temperature: defaultConfig.temperature,
          sysPrompt: defaultConfig.sysPrompt,
          userPrompt: defaultConfig.userPrompt,
        }
      );

      const translatedLines: string[] = [];
      for (let i = 0; i < cleanLines.length; i++) {
        const translated = await translate({
          text: cleanLines[i],
          targetLanguage,
          sourceLanguage,
          cacheSuffix,
          translationMethod,
          useCache: true,
          apiKey: apiKey || defaultConfig.apiKey,
          region: defaultConfig.region,
          url: defaultConfig.url,
          model: defaultConfig.model,
          apiVersion: defaultConfig.apiVersion,
          temperature: defaultConfig.temperature,
          sysPrompt: defaultConfig.sysPrompt,
          userPrompt: defaultConfig.userPrompt,
          useRelay: defaultConfig.useRelay,
          enableThinking: defaultConfig.enableThinking,
        });
        translatedLines.push(isAss ? restoreAssAfterTranslation([translated], tagMaps)[0] : translated);
      }

      // 生成双语字幕
      const translatedTextArray = [...lines];

      contentIndices.forEach((index, i) => {
        if (detectedFileType === "ass") {
          const originalLine = lines[index];
          const prefix = originalLine.substring(0, originalLine.split(",", assContentStartIndex).join(",").length + 1);
          if (bilingualPosition === "below") {
            translatedTextArray[index] = `${originalLine}\\N${prefix}${translatedLines[i]}`;
          } else {
            translatedTextArray[index] = `${prefix}${translatedLines[i]}\\N${originalLine.split(",").slice(assContentStartIndex).join(",").trim()}`;
          }
        } else if (detectedFileType === "lrc") {
          const originalLine = lines[index];
          const timeMatches = originalLine.match(/\[\d{2}:\d{2}\.\d{2,3}\]/g) || [];
          const timePrefix = timeMatches.join("");
          const originalContent = originalLine.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();

          if (bilingualPosition === "below") {
            translatedTextArray[index] = `${timePrefix} ${originalContent} / ${translatedLines[i]}`;
          } else {
            translatedTextArray[index] = `${timePrefix} ${translatedLines[i]} / ${originalContent}`;
          }
        } else {
          // SRT/VTT
          translatedTextArray[index] = bilingualPosition === "below"
            ? `${lines[index]}\n${translatedLines[i]}`
            : `${translatedLines[i]}\n${lines[index]}`;
        }
      });

      // 处理 SRT/VTT 双语转换为 ASS 格式
      let finalOutput = "";
      const needsAssConversion = (detectedFileType === "srt" || detectedFileType === "vtt") && contentLines.length > 0;

      if (needsAssConversion) {
        const subtitles: Record<string, { first: string; second: string }> = {};

        contentIndices.forEach((index, i) => {
          let timeLine = "";
          let searchIndex = index - 1;

          while (searchIndex >= 0) {
            const line = lines[searchIndex];
            if (/(\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3})/.test(line)) {
              timeLine = line;
              break;
            }
            searchIndex--;
          }

          if (!timeLine) return;

          const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2})[,\.](\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2})[,\.](\d{3})/);
          if (!timeMatch) return;

          const startTime = timeMatch[1].replace(/:/g, ":");
          const endTime = timeMatch[3].replace(/:/g, ":");
          const assStartTime = startTime.replace(/(\d{2}):(\d{2}):(\d{2})/, "$1:$2:$3.$4");
          const assEndTime = endTime.replace(/(\d{2}):(\d{2}):(\d{2})/, "$1:$2:$3.$5");

          const key = `${assStartTime} --> ${assEndTime}`;
          const originalText = lines[index];
          const translatedText = translatedLines[i];

          const isFirstOriginal = bilingualPosition === "above";
          const firstText = isFirstOriginal ? originalText : translatedText;
          const secondText = isFirstOriginal ? translatedText : originalText;

          if (subtitles[key]) {
            subtitles[key].first += `\\N${firstText}`;
            subtitles[key].second += `\\N${secondText}`;
          } else {
            subtitles[key] = {
              first: `Dialogue: 0,${assStartTime},${assEndTime},Secondary,NTP,0000,0000,0000,,${firstText}`,
              second: `Dialogue: 0,${assStartTime},${assEndTime},Default,NTP,0000,0000,0000,,${secondText}`,
            };
          }
        });

        finalOutput = assHeader + "\n";
        Object.values(subtitles).forEach(({ first, second }) => {
          finalOutput += `${first}\n${second}\n`;
        });
      } else {
        // ASS 或 LRC 直接组合
        finalOutput = [...translatedTextArray.slice(0, contentIndices[0]), ...styleBlockLines, ...translatedTextArray.slice(contentIndices[0])].join("\n");
      }

      // 生成文件名
      const originalName = req.file.originalname || "subtitle";
      const baseName = originalName.replace(/\.[^/.]+$/, "");
      const ext = needsAssConversion ? "ass" : detectedFileType;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${baseName}_bilingual.${ext}`);
      res.send(finalOutput);

    } catch (error) {
      console.error("翻译字幕文件时出错:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "翻译失败",
      });
    }
  })
);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
}

export default router;