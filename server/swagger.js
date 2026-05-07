// Swagger configuration

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Subtitle Translator API',
      version: '1.0.0',
      description: 'Backend API for subtitle translation service supporting multiple translation providers and AI models.\n\n字幕翻译后端 API，支持多种翻译服务和 AI 模型。',
      contact: {
        name: 'Subtitle Translator',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '本地开发服务器',
      },
      {
        url: 'https://api.example.com',
        description: '生产服务器',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: '健康检查和服务器信息',
      },
      {
        name: 'Translation',
        description: '单文本翻译操作',
      },
      {
        name: 'Batch Translation',
        description: '批量翻译及任务管理',
      },
      {
        name: 'Upload',
        description: '字幕文件上传和处理',
      },
      {
        name: 'Services',
        description: '翻译服务和配置',
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
              description: '待翻译文本或文本数组',
            },
            targetLanguage: {
              type: 'string',
              description: '目标语言代码',
            },
            sourceLanguage: {
              type: 'string',
              description: '源语言代码（默认 auto）',
            },
            translationMethod: {
              type: 'string',
              description: '使用的翻译服务/方法',
            },
            useCache: {
              type: 'boolean',
              description: '启用翻译缓存（默认 true）',
            },
            config: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: '服务 API 密钥' },
                region: { type: 'string', description: '服务区域' },
                url: { type: 'string', description: '自定义端点 URL' },
                model: { type: 'string', description: 'LLM 模型名称' },
                temperature: { type: 'number', minimum: 0, maximum: 2, description: 'LLM 模型的温度参数' },
                sysPrompt: { type: 'string', description: 'LLM 模型的系统提示词' },
                userPrompt: { type: 'string', description: 'LLM 模型的用户提示词' },
                useRelay: { type: 'boolean', description: '使用中继代理进行 API 请求' },
                enableThinking: { type: 'boolean', description: '启用支持模型的思考模式' },
              },
            },
          },
        },
        TranslateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: '请求是否成功' },
            result: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
              description: '翻译后的文本或文本数组',
            },
            error: { type: 'string', description: '请求失败时的错误信息' },
          },
        },
        BatchTranslateRequest: {
          type: 'object',
          required: ['texts', 'targetLanguage', 'translationMethod'],
          properties: {
            texts: {
              type: 'array',
              items: { type: 'string' },
              description: '待翻译的文本数组',
            },
            targetLanguage: {
              type: 'string',
              description: '目标语言代码',
            },
            sourceLanguage: {
              type: 'string',
              description: '源语言代码（默认 auto）',
            },
            translationMethod: {
              type: 'string',
              description: '使用的翻译服务/方法',
            },
            useCache: {
              type: 'boolean',
              description: '启用翻译缓存（默认 true）',
            },
            enableProgress: {
              type: 'boolean',
              description: '启用进度跟踪（返回 jobId）',
            },
            config: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: 'API 密钥' },
                region: { type: 'string', description: '服务区域' },
                url: { type: 'string', description: '自定义端点 URL' },
                model: { type: 'string', description: 'LLM 模型名称' },
                temperature: { type: 'number', description: '温度参数' },
                batchSize: { type: 'number', description: '上下文感知翻译的批次大小' },
                contextWindow: { type: 'number', description: '上下文窗口大小' },
                maxConcurrent: { type: 'number', description: '最大并发请求数' },
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
              description: '翻译后的文本',
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
            jobId: { type: 'string', description: '异步处理的任务 ID' },
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
            createdAt: { type: 'number', description: '时间戳（毫秒）' },
            completedAt: { type: 'number' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', description: '错误信息' },
          },
        },
        UploadFileResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: '上传是否成功' },
            fileType: {
              type: 'string',
              enum: ['srt', 'vtt', 'ass', 'lrc'],
              description: '检测到或指定的字幕文件类型',
            },
            contentLines: {
              type: 'array',
              items: { type: 'string' },
              description: '提取的字幕内容行',
            },
            totalLines: { type: 'number', description: '内容行总数' },
            error: { type: 'string', description: '上传失败时的错误信息' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
  extensions: ['.ts', '.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;