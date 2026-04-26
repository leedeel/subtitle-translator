// Translation API routes

import { Router, Request, Response } from "express";
import { useTranslation, generateCacheSuffix, findMethodLabel, TRANSLATION_SERVICES, LLM_MODELS, getDefaultConfig } from "../lib/translation";
import type { TranslateRequest, TranslateResponse } from "../types";
import { asyncHandler } from "../middleware";

const router = Router();

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