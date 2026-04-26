// Shared helpers for translation service implementations

import { getProxyUrl } from "../utils/proxy";

const FETCH_TIMEOUT = Number.parseInt(process.env.FETCH_TIMEOUT || "60000", 10);
const LLM_RELAY_BASE = process.env.LLM_RELAY_BASE || "https://llm-proxy.aishort.top";

export const relayUrl = (provider: string): string => `${LLM_RELAY_BASE}/api/${provider}`;

export const PROXY_ENDPOINTS = {
  deepl: process.env.DEEPL_PROXY_URL || "https://api-edgeone.newzone.top/api/deepl",
  nvidia: process.env.NVIDIA_PROXY_URL || "https://api-edgeone.newzone.top/api/nvidia",
} as const;

export const THIRD_PARTY_ENDPOINTS = {
  deeplx: "https://deeplx.aishort.top/translate",
  deepseekRelay: relayUrl("deepseek"),
} as const;

export const normalizePrompt = (value: string | undefined, fallback: string): string =>
  typeof value === "string" && value.trim() ? value : fallback;

export const normalizeNumber = (value: unknown, fallback: number | undefined): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : (fallback ?? 0);
};

export const requireApiKey = (serviceName: string, apiKey: string | undefined): string => {
  const key = apiKey?.trim();
  if (!key) {
    throw new Error(`${serviceName} API Key is required`);
  }
  return key;
};

export const requireUrl = (serviceName: string, url: string | undefined): string => {
  const endpoint = url?.trim().replace(/\/+$/, "");
  if (!endpoint) {
    throw new Error(`${serviceName} endpoint URL is required`);
  }
  return endpoint;
};

const ERROR_HINTS: Record<number, string> = {
  401: " (API Key invalid or expired / API 密钥无效或已过期)",
  403: " (Access forbidden / 访问被禁止)",
  429: " (Rate limit exceeded, please retry later / 请求过于频繁，请稍后重试)",
};

const getHint = (code: number): string =>
  ERROR_HINTS[code] ?? (code >= 500 && code < 600 ? " (Server error, please retry later / 服务器错误，请稍后重试)" : "");

export const getErrorMessage = (data: unknown, status: number): string => {
  const obj = data as Record<string, unknown> | null;
  const errorObj = obj?.error as Record<string, unknown> | string | undefined;

  if (errorObj && typeof errorObj === "object") {
    const msg = errorObj.message;
    const code = (typeof errorObj.code === "number" ? errorObj.code : null) ?? status;
    if (typeof msg === "string" && msg.trim()) {
      return `[${code}] ${msg}${getHint(code)}`;
    }
  }

  const topLevel =
    (typeof errorObj === "string" ? errorObj : null) ?? (typeof obj?.message === "string" ? (obj.message as string) : null);
  if (topLevel?.trim()) {
    return `[${status}] ${topLevel}${getHint(status)}`;
  }

  return `HTTP error! status: ${status}${getHint(status)}`;
};

export const fetchJSON = async (url: string, init?: RequestInit): Promise<unknown> => {
  const proxyUrl = getProxyUrl();
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  let shouldUseProxy = false;
  if (proxyUrl && noProxy) {
    const noProxyHosts = noProxy.split(",").map((h) => h.trim().toLowerCase());
    const urlHost = new URL(url).hostname.toLowerCase();
    shouldUseProxy = !noProxyHosts.some((np) => urlHost === np || urlHost.endsWith(`.${np}`));
  } else if (proxyUrl) {
    shouldUseProxy = true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  if (init?.signal) {
    init.signal.addEventListener("abort", () => {
      clearTimeout(timeout);
    });
  }

  const fetchInit: RequestInit = {
    ...init,
    signal: controller.signal,
  };

  try {
    let response: Response;

    if (shouldUseProxy) {
      const { ProxyAgent } = await import("undici");
      const agent = new ProxyAgent(proxyUrl);
      response = await fetch(url, { ...fetchInit, dispatcher: agent as any });
    } else {
      response = await fetch(url, fetchInit);
    }

    clearTimeout(timeout);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(getErrorMessage(data, response.status));
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};

export const getOpenAICompatContent = (data: unknown, serviceName: string): string => {
  const content = (data as { choices?: Array<{ message?: { content?: string } }> } | null)?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`Invalid response format from ${serviceName} API`);
  }
  return content.trim();
};

export const getClaudeContent = (data: unknown, enableThinking: boolean): string => {
  const contentArray = (data as { content?: Array<{ type?: string; text?: string }> } | null)?.content;
  if (!Array.isArray(contentArray) || contentArray.length === 0) {
    throw new Error("Invalid response format from Claude API");
  }
  if (enableThinking) {
    const textBlock = contentArray.find((block) => block.type === "text");
    if (!textBlock || typeof textBlock.text !== "string") {
      throw new Error("Invalid response format from Claude API (no text block found)");
    }
    return textBlock.text.trim();
  }
  const text = contentArray[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Invalid response format from Claude API");
  }
  return text.trim();
};