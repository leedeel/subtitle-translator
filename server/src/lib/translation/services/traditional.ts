// Translation services - Traditional APIs (GTX, Google, DeepL, Azure)
// Adapted from browser version for server-side use

import type { TranslationService } from "../types";
import { defaultConfigs } from "../registry";
import { fetchJSON, requireApiKey, PROXY_ENDPOINTS, THIRD_PARTY_ENDPOINTS, getOpenAICompatContent } from "../shared";

const DEEPL_SOURCE_MAP: Record<string, string> = {
  "zh-hant": "ZH",
  "pt-br": "PT",
  "pt-pt": "PT",
  fil: "TL",
};

const DEEPL_TARGET_MAP: Record<string, string> = {
  en: "EN-US",
  zh: "ZH-HANS",
  "zh-hant": "ZH-HANT",
  fil: "TL",
};

const toDeepLSource = (lang: string): string => DEEPL_SOURCE_MAP[lang] ?? lang.toUpperCase();

const toDeepLTarget = (lang: string): string => DEEPL_TARGET_MAP[lang] ?? lang.toUpperCase();

const getAzureRegion = (region: string | undefined): string => {
  const value = region?.trim();
  if (!value) {
    throw new Error("Azure Translate region is required");
  }
  return value;
};

export const gtxFreeAPI: TranslationService = async (params) => {
  const { text, targetLanguage, sourceLanguage } = params;
  const apiEndpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;

  const data = (await fetchJSON(apiEndpoint, {
    signal: params.signal,
  })) as unknown[][][];

  return data[0].map((part) => part[0]).join("");
};

export const google: TranslationService = async (params) => {
  const { text, targetLanguage, sourceLanguage, apiKey } = params;
  const key = requireApiKey("Google Translate", apiKey);
  const requestBody = {
    q: text,
    target: targetLanguage,
    ...(sourceLanguage !== "auto" && { source: sourceLanguage }),
  };

  const data = (await fetchJSON(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: params.signal,
  })) as { data: { translations: Array<{ translatedText: string }> } };
  return data.data.translations[0].translatedText;
};

export const deepl: TranslationService = async (params) => {
  const { text, targetLanguage, sourceLanguage, url, apiKey } = params;
  const key = requireApiKey("DeepL", apiKey);
  const requestBody = {
    text,
    target_lang: toDeepLTarget(targetLanguage),
    authKey: key,
    tag_handling: "html",
    ...(sourceLanguage !== "auto" && { source_lang: toDeepLSource(sourceLanguage) }),
  };

  const data = (await fetchJSON(url || PROXY_ENDPOINTS.deepl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: params.signal,
  })) as { translations: Array<{ text: string }> };
  return data.translations[0].text;
};

export const deeplx: TranslationService = async (params) => {
  const { text, targetLanguage, sourceLanguage, url } = params;
  const requestBody = {
    text,
    target_lang: toDeepLTarget(targetLanguage),
    ...(sourceLanguage !== "auto" && { source_lang: toDeepLSource(sourceLanguage) }),
  };

  const data = (await fetchJSON(url || THIRD_PARTY_ENDPOINTS.deeplx, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: params.signal,
  })) as { data: string };
  return data.data;
};

export const azure: TranslationService = async (params) => {
  const { text, targetLanguage, sourceLanguage, apiKey, region } = params;
  const apiEndpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLanguage}${sourceLanguage !== "auto" ? `&from=${sourceLanguage}` : ""}`;

  const key = requireApiKey("Azure Translate", apiKey);
  const resolvedRegion = getAzureRegion(region);

  const data = (await fetchJSON(apiEndpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": resolvedRegion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ Text: text }]),
    signal: params.signal,
  })) as Array<{ translations: Array<{ text: string }> }>;
  return data[0].translations[0].text;
};

export const qwenMt: TranslationService = async (params) => {
  const { text, targetLanguage, sourceLanguage, apiKey, url, model, domains } = params;

  const key = requireApiKey("Qwen-MT", apiKey);
  const apiUrl = url?.trim() || defaultConfigs.qwenMt.url!;

  const getQwenMtLangCode = (lang: string) => {
    if (lang === "auto") return "auto";
    const mapping: Record<string, string> = {
      "zh-hant": "zh_tw",
      "pt-br": "pt",
      "pt-pt": "pt",
      fil: "tl",
    };
    return mapping[lang] || lang;
  };

  const sourceLangCode = getQwenMtLangCode(sourceLanguage);
  const targetLangCode = getQwenMtLangCode(targetLanguage);

  const translationOptions: Record<string, string> = {
    source_lang: sourceLangCode,
    target_lang: targetLangCode,
  };

  if (domains && domains.trim()) {
    translationOptions.domains = domains.trim();
  }

  const data = await fetchJSON(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: text }],
      model: model || defaultConfigs.qwenMt.model!,
      translation_options: translationOptions,
      stream: false,
    }),
    signal: params.signal,
  });
  return getOpenAICompatContent(data, "Qwen-MT");
};