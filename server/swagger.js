// Swagger configuration

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Subtitle Translator API',
      version: '1.0.0',
      description: 'Backend API for subtitle translation service supporting multiple translation providers and AI models.',
      contact: {
        name: 'Subtitle Translator',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check and server information',
      },
      {
        name: 'Translation',
        description: 'Single text translation operations',
      },
      {
        name: 'Batch Translation',
        description: 'Batch translation with job management',
      },
      {
        name: 'Upload',
        description: 'Subtitle file upload and processing',
      },
      {
        name: 'Services',
        description: 'Translation services and configuration',
      },
    ],
    components: {
      schemas: {
        TranslateRequest: {
          type: 'object',
          required: ['text', 'targetLanguage', 'translationMethod'],
          properties: {
            text: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
              description: 'Text or array of texts to translate',
            },
            targetLanguage: {
              type: 'string',
              description: "Target language code (e.g., 'en', 'zh', 'ja')",
            },
            sourceLanguage: {
              type: 'string',
              description: "Source language code (default: 'auto')",
            },
            translationMethod: {
              type: 'string',
              description: 'Translation service/method to use',
              enum: [
                'gtxFreeAPI', 'google', 'deepl', 'azure', 'deeplx', 'qwenMt',
                'deepseek', 'openai', 'claude', 'gemini', 'qwen', 'moonshot',
                'zhipu', 'doubao', 'xAI', 'mistral', 'perplexity',
                'openrouter', 'groq', 'siliconflow', 'nvidia', 'azureOpenAI', 'customLLM'
              ],
            },
            useCache: {
              type: 'boolean',
              description: 'Enable translation caching (default: true)',
            },
            config: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: 'API key for service' },
                region: { type: 'string', description: 'Region for service' },
                url: { type: 'string', description: 'Custom endpoint URL' },
                model: { type: 'string', description: 'LLM model name' },
                temperature: { type: 'number', minimum: 0, maximum: 2, description: 'Temperature for LLM models' },
                sysPrompt: { type: 'string', description: 'System prompt for LLM models' },
                userPrompt: { type: 'string', description: 'User prompt for LLM models' },
                useRelay: { type: 'boolean', description: 'Use relay proxy for API requests' },
                enableThinking: { type: 'boolean', description: 'Enable thinking mode for supported models' },
              },
            },
          },
        },
        TranslateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Whether the request was successful' },
            result: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
              description: 'Translated text or array of translated texts',
            },
            error: { type: 'string', description: 'Error message if the request failed' },
          },
        },
        BatchTranslateRequest: {
          type: 'object',
          required: ['texts', 'targetLanguage', 'translationMethod'],
          properties: {
            texts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of texts to translate',
            },
            targetLanguage: {
              type: 'string',
              description: 'Target language code',
            },
            sourceLanguage: {
              type: 'string',
              description: "Source language code (default: 'auto')",
            },
            translationMethod: {
              type: 'string',
              description: 'Translation service/method to use',
            },
            useCache: {
              type: 'boolean',
              description: 'Enable translation caching (default: true)',
            },
            enableProgress: {
              type: 'boolean',
              description: 'Enable progress tracking (returns jobId)',
            },
            config: {
              type: 'object',
              properties: {
                apiKey: { type: 'string' },
                region: { type: 'string' },
                url: { type: 'string' },
                model: { type: 'string' },
                temperature: { type: 'number' },
                batchSize: { type: 'number', description: 'Batch size for context-aware translation' },
                contextWindow: { type: 'number', description: 'Context window size' },
                maxConcurrent: { type: 'number', description: 'Maximum concurrent requests' },
              },
            },
          },
        },
        BatchTranslateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: {
              type: 'array',
              items: { type: 'string' },
              description: 'Translated texts',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number' },
                  error: { type: 'string' },
                },
              },
            },
            jobId: { type: 'string', description: 'Job ID for async processing' },
          },
        },
        JobStatusResponse: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
            },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            result: {
              type: 'array',
              items: { type: 'string' },
            },
            error: { type: 'string' },
            createdAt: { type: 'number', description: 'Timestamp in milliseconds' },
            completedAt: { type: 'number' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', description: 'Error message' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
  explorer: true,
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;