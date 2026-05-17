// Batch translation utilities with concurrent request management

import pLimit from "p-limit";
import pRetry from "p-retry";
import type { TranslateTextParams } from "../types";

interface BatchTranslateOptions {
  texts: string[];
  translationMethod: string;
  params: Omit<TranslateTextParams, "text">;
  maxConcurrent?: number;
  onProgress?: (completed: number, total: number) => void;
  retryOptions?: {
    retries?: number;
    onFailedAttempt?: (error: Error) => void;
  };
}

interface BatchTranslateResult {
  results: string[];
  errors: Array<{ index: number; error: string }>;
}

export const batchTranslate = async (options: BatchTranslateOptions): Promise<BatchTranslateResult> => {
  const { texts, translationMethod, params, maxConcurrent = 10, onProgress, retryOptions = {} } = options;
  const { retries = 3, onFailedAttempt } = retryOptions;

  const service = translationMethod;
  const results = new Array(texts.length).fill("");
  const errors: Array<{ index: number; error: string }> = [];

  const limit = pLimit(maxConcurrent);
  let completed = 0;

  const translateWithRetry = async (
    text: string,
    index: number
  ): Promise<string> => {
    return pRetry(
      async () => {
        const result = await (await import("./translation")).translationServices[service]({
          ...params,
          text,
        });
        return result;
      },
      {
        retries,
        onFailedAttempt: (context: any) => {
          console.warn(`Translation failed for item ${index}, attempt ${context.attemptNumber}:`, context.message);
          if (onFailedAttempt) {
            onFailedAttempt(context);
          }
        },
        shouldRetry: (error) => {
          if (error instanceof Error) {
            const errorMessage = error.message;
            if (errorMessage.includes("[401]") || errorMessage.includes("[403]")) {
              return false;
            }
            return true;
          }
          return true;
        },
      }
    );
  };

  const promises = texts.map((text, index) =>
    limit(async () => {
      try {
        const result = await translateWithRetry(text, index);
        results[index] = result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({ index, error: errorMessage });
        console.error(`Translation failed for item ${index}:`, error);
      }
      completed++;
      if (onProgress) {
        onProgress(completed, texts.length);
      }
    })
  );

  await Promise.all(promises);

  return { results, errors };
};

export const batchTranslateWithContext = async (
  options: BatchTranslateOptions & {
    batchSize?: number;
    contextWindow?: number;
  }
): Promise<BatchTranslateResult> => {
  const { texts, params, batchSize = 20, contextWindow = 50 } = options;

  if (texts.length === 0) {
    return { results: [], errors: [] };
  }

  const defaultBatchSize = Number.parseInt(process.env.DEFAULT_BATCH_SIZE || "20", 10);
  const effectiveBatchSize = batchSize || defaultBatchSize;
  const effectiveContextWindow = contextWindow || 50;

  const batches: { startIndex: number; endIndex: number; items: string[] }[] = [];
  for (let i = 0; i < texts.length; i += effectiveBatchSize) {
    const endIndex = Math.min(i + effectiveBatchSize, texts.length);
    batches.push({
      startIndex: i,
      endIndex,
      items: texts.slice(i, endIndex),
    });
  }

  const allResults = new Array(texts.length).fill("");
  const allErrors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const contextStart = Math.max(0, batch.startIndex - effectiveContextWindow);
    const contextEnd = Math.min(texts.length, batch.endIndex + effectiveContextWindow);
    const contextTexts = texts.slice(contextStart, contextEnd);

    const contextParams = {
      ...params,
      fullText: contextTexts.join("\n"),
    };

    const { results, errors } = await batchTranslate({
      ...options,
      texts: batch.items,
      params: contextParams,
      onProgress: (completed, total) => {
        if (options.onProgress) {
          const overallCompleted = batch.startIndex + completed;
          options.onProgress(overallCompleted, texts.length);
        }
      },
    });

    batch.items.forEach((_, idx) => {
      const globalIndex = batch.startIndex + idx;
      allResults[globalIndex] = results[idx];
    });

    allErrors.push(...errors.map((e) => ({ index: batch.startIndex + e.index, error: e.error })));
  }

  return { results: allResults, errors: allErrors };
};

export const isAuthError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes("[401]") || error.message.includes("[403]");
  }
  return false;
};