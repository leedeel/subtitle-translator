// Request validation middleware

import { Request, Response, NextFunction } from "express";
import type { TranslateRequest, BatchTranslateRequest, UploadFileRequest } from "../types";

export const validateTranslateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Partial<TranslateRequest>;

  if (!body.text) {
    res.status(400).json({
      success: false,
      error: "Missing required field: text",
    });
    return;
  }

  if (!body.targetLanguage) {
    res.status(400).json({
      success: false,
      error: "Missing required field: targetLanguage",
    });
    return;
  }

  if (!body.translationMethod) {
    res.status(400).json({
      success: false,
      error: "Missing required field: translationMethod",
    });
    return;
  }

  next();
};

export const validateBatchTranslateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as Partial<BatchTranslateRequest>;

  if (!body.texts || !Array.isArray(body.texts)) {
    res.status(400).json({
      success: false,
      error: "Missing required field: texts (must be an array)",
    });
    return;
  }

  if (body.texts.length === 0) {
    res.status(400).json({
      success: false,
      error: "texts array cannot be empty",
    });
    return;
  }

  if (body.texts.length > 1000) {
    res.status(400).json({
      success: false,
      error: "texts array cannot exceed 1000 items",
    });
    return;
  }

  if (!body.targetLanguage) {
    res.status(400).json({
      success: false,
      error: "Missing required field: targetLanguage",
    });
    return;
  }

  if (!body.translationMethod) {
    res.status(400).json({
      success: false,
      error: "Missing required field: translationMethod",
    });
    return;
  }

  next();
};