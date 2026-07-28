// File upload API routes / 文件上传 API 路由

import { Router, Request, Response } from "express";
import multer from "multer";
import {
  assHeader,
  convertTimeToAss,
  detectSubtitleFormat,
  filterSubLines,
  normalizeSrtTimestamp,
  parseSrtCues,
  prepareAssForTranslation,
  restoreAssAfterTranslation,
  VTT_SRT_TIME,
} from "../lib/subtitle";
import { generateCacheSuffix, getDefaultConfig, useTranslation } from "../lib/translation";
import type { JsonSubtitleItem, UploadFileResponse, UploadFileRequest, UploadTranslateRequest } from "../types";
import { asyncHandler } from "../middleware";
import { readEncoding } from "../lib/utils/encoding";

// BufferEncoding type for Node.js compatibility
type BufferEncoding = "utf8" | "utf-8" | "ascii" | "base64" | "binary" | "hex" | "ucs2" | "ucs-2" | "utf16le" | "utf-16le" | "latin1";

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
    const body = req.body as Partial<UploadFileRequest>;

    try {
      const encoding = await readEncoding(buffer);
      const content = buffer.toString(encoding as BufferEncoding);
      const lines = content.split(/\r?\n/);

      const fileType = body.fileType || detectSubtitleFormat(lines);

      if (fileType === "error") {
        res.status(400).json({
          success: false,
          error: "Unable to detect subtitle file format. Supported formats: SRT, VTT, ASS, LRC",
        });
        return;
      }

      const { contentLines } = filterSubLines(lines, fileType);

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
      const { prepareAssForTranslation, restoreAssAfterTranslation } = await import("../lib/subtitle");
      const { cleanLines: cleanOriginal, tagMaps: originalTags } = prepareAssForTranslation(originalLines);
      const { cleanLines: cleanTranslated, tagMaps: translatedTags } = prepareAssForTranslation(translatedLines);

      // 还原 ASS 标签与换行符（\N），避免真换行泄漏进 Dialogue 行
      const restoredOriginal = restoreAssAfterTranslation(cleanOriginal, originalTags);
      const restoredTranslated = restoreAssAfterTranslation(cleanTranslated, translatedTags);

      const bilingualLines = restoredOriginal.map((orig, i) => {
        return `${orig}\\N${restoredTranslated[i]}`;
      });

      output = assHeader + "\n";
      bilingualLines.forEach((line) => {
        output += `Dialogue: 0,0:00:00.00,0:00:05.00,Default,,${line}\n`;
      });
    } else if (fileType === "vtt") {
      output = "WEBVTT\n\n";
      originalLines.forEach((line: string, i: number) => {
        output += `${i + 1}\n00:00:00.000 --> 00:00:05.000\n${line}\n${translatedLines[i]}\n\n`;
      });
    } else if (fileType === "lrc") {
      originalLines.forEach((line: string, i: number) => {
        output += `[${formatTime(i)}]${line} / ${translatedLines[i]}\n`;
      });
    } else {
      originalLines.forEach((line: string, i: number) => {
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
 *                 description: 源语言代码（默认 auto；JSON 输出时必须显式指定且不能为 auto）
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
 *               outputFormat:
 *                 type: string
 *                 enum: [ass, json]
 *                 default: ass
 *                 description: 输出格式。json 仅支持 SRT 输入，并返回字幕对象数组
 *     responses:
 *       200:
 *         description: 翻译成功，默认返回双语字幕文件；outputFormat=json 时返回字幕对象数组
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 required: [start, end]
 *                 properties:
 *                   start:
 *                     type: string
 *                     example: "00:00:00,000"
 *                   end:
 *                     type: string
 *                     example: "00:00:02,360"
 *                 additionalProperties:
 *                   type: string
 *             example:
 *               - start: "00:00:00,000"
 *                 end: "00:00:02,360"
 *                 en: "Steve Bannon, welcome to the insider."
 *                 zh: "史蒂夫·班农，欢迎来到内部人士。"
 *       400:
 *         description: 请求错误、JSON 输出参数无效或输入不是 SRT
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

    const body = req.body as Partial<UploadTranslateRequest>;
    const {
      targetLanguage: targetLanguageOption,
      sourceLanguage: sourceLanguageOption,
      translationMethod: translationMethodOption,
      apiKey,
      fileType: fileTypeOption,
      bilingualPosition = "below",
      outputFormat: outputFormatOption = "ass",
    } = body;
    const targetLanguage = typeof targetLanguageOption === "string" ? targetLanguageOption.trim() : "";
    const sourceLanguage = typeof sourceLanguageOption === "string" && sourceLanguageOption.trim() !== "" ? sourceLanguageOption.trim() : "auto";
    const translationMethod = typeof translationMethodOption === "string" ? translationMethodOption.trim() : "";

    if (!targetLanguage || !translationMethod) {
      res.status(400).json({
        success: false,
        error: "缺少必填参数：targetLanguage 和 translationMethod",
      });
      return;
    }

    const normalizedOutputFormat = typeof outputFormatOption === "string" ? outputFormatOption.trim().toLowerCase() : "";
    if (normalizedOutputFormat !== "ass" && normalizedOutputFormat !== "json") {
      res.status(400).json({
        success: false,
        error: "outputFormat 仅支持 ass 或 json",
      });
      return;
    }
    const outputFormat = normalizedOutputFormat as "ass" | "json";

    try {
      const buffer = req.file.buffer;
      const encoding = await readEncoding(buffer);
      const content = buffer.toString(encoding as BufferEncoding);
      const lines = content.split(/\r?\n/);

      const detectedFileType = fileTypeOption || detectSubtitleFormat(lines);

      if (detectedFileType === "error") {
        res.status(400).json({
          success: false,
          error: "无法检测字幕文件格式。支持的格式：SRT、VTT、ASS、LRC",
        });
        return;
      }

      let sourceLanguageField = "";
      let targetLanguageField = "";
      let srtCues: ReturnType<typeof parseSrtCues> = [];
      let contentLines: string[] = [];
      let contentIndices: number[] = [];
      let assContentStartIndex = 9;
      let styleBlockLines: string[] = [];

      if (outputFormat === "json") {
        if (detectedFileType !== "srt") {
          res.status(400).json({
            success: false,
            error: "JSON 输出仅支持 SRT 输入格式",
          });
          return;
        }

        if (sourceLanguage.toLowerCase() === "auto") {
          res.status(400).json({
            success: false,
            error: "JSON 输出要求显式提供 sourceLanguage，且不能为 auto",
          });
          return;
        }

        sourceLanguageField = normalizeLanguageField(sourceLanguage);
        targetLanguageField = normalizeLanguageField(targetLanguage);
        if (!isValidLanguageField(sourceLanguageField) || !isValidLanguageField(targetLanguageField)) {
          res.status(400).json({
            success: false,
            error: "sourceLanguage 或 targetLanguage 不是有效的语言代码",
          });
          return;
        }
        if (sourceLanguageField === targetLanguageField) {
          res.status(400).json({
            success: false,
            error: "sourceLanguage 和 targetLanguage 必须映射为不同的 JSON 字段",
          });
          return;
        }

        srtCues = parseSrtCues(lines);
        contentLines = srtCues.flatMap((cue) => cue.textLines);
      } else {
        const parsedSubtitle = filterSubLines(lines, detectedFileType);
        contentLines = parsedSubtitle.contentLines;
        contentIndices = parsedSubtitle.contentIndices;
        assContentStartIndex = parsedSubtitle.assContentStartIndex;
        styleBlockLines = parsedSubtitle.styleBlockLines;
      }

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
      const { translate } = useTranslation();
      const defaultConfig = getDefaultConfig(translationMethod);

      if (!defaultConfig) {
        res.status(400).json({
          success: false,
          error: `Unsupported translation method: ${translationMethod}`,
        });
        return;
      }

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
        translatedLines.push(translated);
      }

      // ASS：还原标签与换行符（\N），与 prepareAssForTranslation 对称
      const finalTranslatedLines = isAss ? restoreAssAfterTranslation(translatedLines, tagMaps) : translatedLines;

      if (outputFormat === "json") {
        let translatedLineIndex = 0;
        const jsonResult: JsonSubtitleItem[] = srtCues.map((cue) => {
          const lineCount = cue.textLines.length;
          const translatedCueLines = finalTranslatedLines.slice(translatedLineIndex, translatedLineIndex + lineCount);
          translatedLineIndex += lineCount;

          return {
            start: normalizeSrtTimestamp(cue.start),
            end: normalizeSrtTimestamp(cue.end),
            [sourceLanguageField]: cue.textLines.join("\n"),
            [targetLanguageField]: translatedCueLines.join("\n"),
          };
        });

        res.json(jsonResult);
        return;
      }

      // 生成双语字幕
      const translatedTextArray = [...lines];

      contentIndices.forEach((index, i) => {
        if (detectedFileType === "ass") {
          const originalLine = lines[index];
          const prefix = originalLine.substring(0, originalLine.split(",", assContentStartIndex).join(",").length + 1);
          if (bilingualPosition === "below") {
            translatedTextArray[index] = `${originalLine}\\N${prefix}${finalTranslatedLines[i]}`;
          } else {
            translatedTextArray[index] = `${prefix}${finalTranslatedLines[i]}\\N${originalLine.split(",").slice(assContentStartIndex).join(",").trim()}`;
          }
        } else if (detectedFileType === "lrc") {
          const originalLine = lines[index];
          const timeMatches = originalLine.match(/\[\d{2}:\d{2}\.\d{2,3}\]/g) || [];
          const timePrefix = timeMatches.join("");
          const originalContent = originalLine.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();

          if (bilingualPosition === "below") {
            translatedTextArray[index] = `${timePrefix} ${originalContent} / ${finalTranslatedLines[i]}`;
          } else {
            translatedTextArray[index] = `${timePrefix} ${finalTranslatedLines[i]} / ${originalContent}`;
          }
        } else {
          // SRT/VTT
          translatedTextArray[index] = bilingualPosition === "below"
            ? `${lines[index]}\n${finalTranslatedLines[i]}`
            : `${finalTranslatedLines[i]}\n${lines[index]}`;
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
            if (VTT_SRT_TIME.test(line.trim())) {
              timeLine = line;
              break;
            }
            searchIndex--;
          }

          if (!timeLine) return;

          const [startTime, endTime] = timeLine.split("-->").map((t) => t.trim().split(/\s/)[0]);
          if (!startTime || !endTime) return;

          const assStartTime = convertTimeToAss(startTime);
          const assEndTime = convertTimeToAss(endTime);

          const key = `${assStartTime} --> ${assEndTime}`;
          const originalText = lines[index];
          const translatedText = finalTranslatedLines[i];

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

function normalizeLanguageField(language: string): string {
  return language.trim().toLowerCase().split(/[-_]/)[0];
}

function isValidLanguageField(language: string): boolean {
  return /^[a-z]{2,8}$/.test(language) && language !== "start" && language !== "end";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
}

export default router;