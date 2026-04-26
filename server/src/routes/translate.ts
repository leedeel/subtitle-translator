// Translation API routes / 翻译 API 路由

import { Router, Request, Response } from "express";
import { useTranslation, generateCacheSuffix, findMethodLabel, TRANSLATION_SERVICES, LLM_MODELS, getDefaultConfig } from "../lib/translation";
import type { TranslateRequest, TranslateResponse } from "../types";
import { asyncHandler } from "../middleware";

const router = Router();

/**
 * @swagger
 * /api/translate/services:
 *   get:
 *     tags: [Services]
 *     summary: 获取可用翻译服务
 *     description: 返回所有可用翻译服务及其标签的列表
 *     responses:
 *       200:
 *         description: 翻译服务列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: 是否成功
 *                 services:
 *                   type: object
 *                   description: 翻译服务
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: 服务标签
 *                       category:
 *                         type: string
 *                         enum: [machine-translation, llm, aggregator]
 *                         description: 服务类别
 */

// Get available translation services
router.get(
  "/services",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      services: TRANSLATION_SERVICES,
    });
  })
);

/**
 * @swagger
 * /api/translate/services/{method}/config:
 *   get:
 *     tags: [Services]
 *     summary: 获取翻译服务默认配置
 *     description: 返回特定翻译方法的默认配置
 *     parameters:
 *       - in: path
 *         name: method
 *         required: true
 *         schema:
 *           type: string
 *         description: 翻译方法名称（如 'deepseek', 'google', 'openai'）
 *     responses:
 *       200:
 *         description: 服务配置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 method:
 *                   type: string
 *                   description: 翻译方法
 *                 label:
 *                   type: string
 *                   description: 服务标签
 *                 isLLM:
 *                   type: boolean
 *                   description: 是否为 LLM
 *                 config:
 *                   type: object
 *                   description: 配置
 *       404:
 *         description: 未知的翻译方法
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Get default config for a service
router.get(
  "/services/:method/config",
  asyncHandler(async (req: Request, res: Response) => {
    const { method } = req.params;
    const config = getDefaultConfig(method);

    if (!config) {
      res.status(404).json({
        success: false,
        error: `Unknown translation method: ${method}`,
      });
      return;
    }

    res.json({
      success: true,
      method,
      label: findMethodLabel(method),
      isLLM: LLM_MODELS.includes(method),
      config,
    });
  })
);

/**
 * @swagger
 * /api/translate:
 *   post:
 *     tags: [Translation]
 *     summary: 翻译文本
 *     description: 将单个文本或多个文本翻译为目标语言
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TranslateRequest'
 *     responses:
 *       200:
 *         description: 翻译成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TranslateResponse'
 *       400:
 *         description: 请求错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Translate single text
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as TranslateRequest;
    const { text, targetLanguage, sourceLanguage = "auto", translationMethod, config = {}, useCache = true } = body;

    // Handle both string and array input
    const inputTexts = Array.isArray(text) ? text : [text];
    const isSingleText = !Array.isArray(text);

    const { translate } = useTranslation();
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

    const results: string[] = [];

    for (const inputText of inputTexts) {
      const result = await translate({
        text: inputText,
        targetLanguage,
        sourceLanguage,
        cacheSuffix,
        translationMethod,
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
      });
      results.push(result);
    }

    const response: TranslateResponse = {
      success: true,
      result: isSingleText ? results[0] : results,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /api/translate/test:
 *   post:
 *     tags: [Translation]
 *     summary: 测试翻译服务
 *     description: 测试翻译服务是否可访问且配置正确
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - translationMethod
 *             properties:
 *               translationMethod:
 *                 type: string
 *                 description: 要测试的翻译方法
 *               config:
 *                 type: object
 *                 description: 翻译方法的配置
 *               sysPrompt:
 *                 type: string
 *                 description: 要测试的系统提示词
 *               userPrompt:
 *                 type: string
 *                 description: 要测试的用户提示词
 *     responses:
 *       200:
 *         description: 测试结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: 是否成功
 *                 message:
 *                   type: string
 *                   description: 消息
 */

// Test translation
router.post(
  "/test",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Partial<TranslateRequest>;
    const { translationMethod, config = {}, sysPrompt, userPrompt } = body;

    if (!translationMethod) {
      res.status(400).json({
        success: false,
        error: "Missing required field: translationMethod",
      });
      return;
    }

    const { testTranslation } = await import("../lib/translation");
    const defaultConfig = getDefaultConfig(translationMethod);
    const mergedConfig = { ...defaultConfig, ...config };

    const success = await testTranslation(
      translationMethod,
      {
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
      sysPrompt,
      userPrompt
    );

    res.json({
      success,
      message: success ? "Translation test successful" : "Translation test failed",
    });
  })
);

export default router;