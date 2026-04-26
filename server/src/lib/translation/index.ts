// Main translation module

import type { TranslateTextParams, TranslationMethod } from "../types";
import { translationServices } from "./services";
import { generateCacheKey, getCachedTranslation, setCachedTranslation } from "./cache";
import { cleanTranslatedText } from "./utils";

export * from "./registry";
export * from "./config";
export * from "./cache";
export * from "./languages-data";
export * from "./utils";
export { translationServices } from "./services";

const HAS_TRANSLATABLE_CONTENT = /[a-zA-Z\p{L}]/u;

export const testTranslation = async (
  translationMethod: TranslationMethod,
  config: Partial<TranslateTextParams>,
  sysPrompt?: string,
  userPrompt?: string
): Promise<boolean> => {
  try {
    const params: TranslateTextParams = {
      text: "Hello, world!",
      targetLanguage: "zh",
      sourceLanguage: "en",
      cacheSuffix: "test",
      translationMethod,
      useCache: false,
      ...config,
      ...(sysPrompt && { sysPrompt }),
      ...(userPrompt && { userPrompt }),
    };

    const result = await translationServices[translationMethod](params);

    if (!result) throw new Error("Translation Test failed, no result received.");

    if (params.targetLanguage === "zh" && !/[一-龥]/.test(result)) {
      console.warn("Translation result does not contain Chinese characters, may not have actually translated:", result);
    }

    if (result === params.text) {
      console.warn("Translation returned original text unchanged, may indicate translation service issue");
    }

    return true;
  } catch (error) {
    console.error("Translation Test failed", error);
    return false;
  }
};

const translateText = async (params: TranslateTextParams): Promise<string> => {
  const { text, cacheSuffix, translationMethod, targetLanguage, sourceLanguage, useCache = true } = params;

  if (!HAS_TRANSLATABLE_CONTENT.test(text) || sourceLanguage === targetLanguage) {
    return text;
  }

  const cacheKey = generateCacheKey(text, cacheSuffix);
  if (useCache) {
    const cachedTranslation = await getCachedTranslation(cacheKey);
    if (cachedTranslation) return cachedTranslation;
  }

  const service = translationServices[translationMethod];
  if (!service) {
    throw new Error(`Unsupported translation method: ${translationMethod}`);
  }

  const translatedText = await service(params);

  if (!translatedText) {
    throw new Error(`No translation result received for method: ${translationMethod}`);
  }

  const cleanedText = cleanTranslatedText(translatedText);
  await setCachedTranslation(cacheKey, cleanedText);

  return cleanedText;
};

export const useTranslation = () => ({
  translate: translateText,
});