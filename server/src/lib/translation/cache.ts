// Translation cache utilities - server-side LRU cache implementation

import { LRUCache } from "lru-cache";
import SparkMD5 from "spark-md5";
import { DEFAULT_SYS_PROMPT, DEFAULT_USER_PROMPT } from "./config";
import { LLM_MODELS } from "./registry";
import { normalizePrompt } from "./shared";

export const CACHE_PREFIX = "t_";

const MAX_CACHE_SIZE = Number.parseInt(process.env.CACHE_MAX_SIZE || "1000", 10);
const CACHE_MAX_AGE = Number.parseInt(process.env.CACHE_MAX_AGE || "3600000", 10);

type CacheOptions = {
  max?: number;
  ttl?: number;
};

const translationCache = new LRUCache<string, string>({
  max: MAX_CACHE_SIZE,
  ttl: CACHE_MAX_AGE,
});

export const generateCacheSuffix = (
  sourceLanguage: string,
  targetLanguage: string,
  translationMethod: string,
  params: { model?: string; temperature?: number; sysPrompt?: string; userPrompt?: string } = {}
): string => {
  let cacheSuffix = `${targetLanguage}_${sourceLanguage}_${translationMethod}`;

  if (LLM_MODELS.includes(translationMethod)) {
    const llmConfig = JSON.stringify({
      model: params.model || "",
      temperature: params.temperature ?? 0,
      sysPrompt: normalizePrompt(params.sysPrompt, DEFAULT_SYS_PROMPT),
      userPrompt: normalizePrompt(params.userPrompt, DEFAULT_USER_PROMPT),
    });
    const llmConfigHash = SparkMD5.hash(llmConfig);
    cacheSuffix = `${cacheSuffix}_${llmConfigHash}`;
  }

  return cacheSuffix;
};

export const generateCacheKey = (text: string, cacheSuffix: string): string => {
  const encoded = text.length <= 32 ? encodeURIComponent(text) : null;
  const key = encoded && encoded.length <= 50 ? encoded : SparkMD5.hash(text);
  return `${CACHE_PREFIX}${key}_${cacheSuffix}`;
};

export const getCachedTranslation = async (cacheKey: string): Promise<string | null> => {
  const cached = translationCache.get(cacheKey);
  return cached ?? null;
};

export const setCachedTranslation = async (cacheKey: string, translation: string): Promise<void> => {
  translationCache.set(cacheKey, translation);
};

export const clearTranslationCache = async (): Promise<number> => {
  const size = translationCache.size;
  translationCache.clear();
  return size;
};

export const getCacheStats = (): { size: number; max: number } => {
  return {
    size: translationCache.size,
    max: MAX_CACHE_SIZE,
  };
};