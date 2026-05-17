// Translation services dispatch table

import type { TranslateTextParams, TranslationService } from "../../../types";
import { gtxFreeAPI, google, deepl, azure, deeplx, qwenMt } from "./traditional";
import {
  deepseek,
  openai,
  claude,
  gemini,
  qwen,
  moonshot,
  zhipu,
  doubao,
  grok,
  mistral,
  perplexity,
  openrouter,
  groq,
  siliconflow,
  nvidia,
  azureopenai,
  llm,
} from "./llm";

export const translationServices: Record<string, TranslationService> = {
  gtxFreeAPI,
  google,
  deepl,
  azure,
  deeplx,
  qwenMt,
  deepseek,
  openai,
  claude,
  gemini,
  qwen,
  moonshot,
  zhipu,
  doubao,
  grok,
  mistral,
  perplexity,
  openrouter,
  groq,
  siliconflow,
  nvidia,
  azureopenai,
  llm,
};