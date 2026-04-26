// API request/response types

export interface TranslateRequest {
  text: string | string[];
  targetLanguage: string;
  sourceLanguage?: string;
  translationMethod: string;
  config?: Partial<{
    apiKey: string;
    region: string;
    url: string;
    model: string;
    apiVersion: string;
    temperature: number;
    batchSize: number;
    contextWindow: number;
    sysPrompt: string;
    userPrompt: string;
    useRelay: boolean;
    enableThinking: boolean;
    domains: string;
    useCache: boolean;
  }>;
  useCache?: boolean;
  enableProgress?: boolean;
}

export interface TranslateResponse {
  success: boolean;
  result?: string | string[];
  error?: string;
  progress?: number;
  jobId?: string;
}

export interface BatchTranslateRequest {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
  translationMethod: string;
  config?: Partial<{
    apiKey: string;
    region: string;
    url: string;
    model: string;
    apiVersion: string;
    temperature: number;
    batchSize: number;
    contextWindow: number;
    sysPrompt: string;
    userPrompt: string;
    useRelay: boolean;
    enableThinking: boolean;
    domains: string;
    useCache: boolean;
    maxConcurrent?: number;
  }>;
  useCache?: boolean;
}

export interface BatchTranslateResponse {
  success: boolean;
  results?: string[];
  errors?: Array<{ index: number; error: string }>;
  jobId?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: string[];
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface UploadFileRequest {
  fileType?: "srt" | "vtt" | "ass" | "lrc";
}

export interface UploadFileResponse {
  success: boolean;
  fileType?: string;
  contentLines?: string[];
  totalLines?: number;
  error?: string;
}