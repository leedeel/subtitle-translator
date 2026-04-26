// Translation API routes

import { Router, Request, Response } from "express";
import { useTranslation, generateCacheSuffix, findMethodLabel, TRANSLATION_SERVICES, LLM_MODELS, getDefaultConfig } from "../lib/translation";
import type { TranslateRequest, TranslateResponse } from "../types";
import { asyncHandler } from "../middleware";

const router = Router();

/**
 * @swagger
 * /translate/services:
 *   get:
 *     tags: [Services]
 *     summary: Get available translation services
 *     description: Returns a list of all available translation services with their labels
 *     responses:
 *       200:
 *         description: List of translation services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 services:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       category:
 *                         type: string
 *                         enum: [machine-translation, llm, aggregator]
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
 * /translate/services/{method}/config:
 *   get:
 *     tags: [Services]
 *     summary: Get default configuration for a translation service
 *     description: Returns the default configuration for a specific translation method
 *     parameters:
 *       - in: path
 *         name: method
 *         required: true
 *         schema:
 *           type: string
 *         description: Translation method name (e.g., 'deepseek', 'google', 'openai')
 *     responses:
 *       200:
 *         description: Service configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 method:
 *                   type: string
 *                 label:
 *                   type: string
 *                 isLLM:
 *                   type: boolean
 *                 config:
 *                   type: object
 *       404:
 *         description: Unknown translation method
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
 * /translate:
 *   post:
 *     tags: [Translation]
 *     summary: Translate text
 *     description: Translate a single text or multiple texts to a target language
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TranslateRequest'
 *     responses:
 *       200:
 *         description: Translation successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TranslateResponse'
 *       400:
 *         description: Bad request
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
 * /translate/test:
 *   post:
 *     tags: [Translation]
 *     summary: Test translation service
 *     description: Test if a translation service is accessible and configured correctly
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
 *                 description: Translation method to test
 *               config:
 *                 type: object
 *                 description: Configuration for the translation method
 *               sysPrompt:
 *                 type: string
 *                 description: System prompt to test
 *               userPrompt:
 *                 type: string
 *                 description: User prompt to test
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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