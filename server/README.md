# Subtitle Translation Server

独立的服务端模块，提供 LLM 翻译相关业务逻辑的接口。

## 功能特性

- **多种翻译服务支持**：支持 DeepSeek, OpenAI, Claude, Gemini, Qwen, Moonshot, Zhipu, 等多种 LLM 服务
- **批量翻译**：支持批量文本翻译，带进度跟踪
- **字幕文件处理**：支持 SRT, VTT, ASS, LRC 格式的字幕文件上传和生成
- **双语字幕生成**：可生成双语字幕文件
- **缓存机制**：内置 LRU 缓存，提高翻译效率
- **并发控制**：支持并发请求限制
- **重试机制**：自动重试失败的翻译请求

## 目录结构

```
server/
├── src/
│   ├── lib/
│   │   ├── translation/      # 翻译服务核心逻辑（复用）
│   │   ├── subtitle/         # 字幕处理工具（复用）
│   │   ├── batch-translate.ts # 批量翻译逻辑
│   │   └── utils/            # 工具函数
│   ├── routes/               # API 路由
│   ├── middleware/           # 中间件
│   ├── types/                # 类型定义
│   ├── app.ts               # Express 应用
│   └── index.ts             # 服务入口
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 安装

```bash
cd server
yarn install
```

## 配置

复制 `.env.example` 为 `.env` 并配置环境变量：

```bash
cp .env.example .env
```

主要配置项：

- `NODE_ENV`: 运行环境 (development/production)
- `PORT`: 服务端口 (默认 3001)
- `HOST`: 服务地址 (默认 0.0.0.0)
- `CORS_ORIGIN`: CORS 允许的源 (默认 *)
- `HTTP_PROXY`: HTTP 代理地址（可选，例如：http://127.0.0.1:7890）
- `HTTPS_PROXY`: HTTPS 代理地址（可选，例如：http://127.0.0.1:7890）
- `NO_PROXY`: 不使用代理的主机列表（可选，例如：localhost,127.0.0.1）
- `CACHE_MAX_SIZE`: 缓存最大条目数 (默认 1000)
- `CACHE_MAX_AGE`: 缓存最大存活时间，毫秒 (默认 3600000)
- `MAX_BATCH_SIZE`: 最大批处理大小 (默认 50)
- `DEFAULT_BATCH_SIZE`: 默认批处理大小 (默认 20)
- `MAX_CONCURRENT_REQUESTS`: 最大并发请求数 (默认 10)
- `LLM_RELAY_BASE`: LLM 中转服务地址 (默认 https://llm-proxy.aishort.top)

### 代理配置

如果网络环境无法直接访问 Google 等翻译 API，可以配置代理：

```bash
# 在 .env 文件中添加
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1
```

或通过环境变量设置：

```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
yarn dev
```

## 运行

### 开发模式

```bash
yarn dev
```

### 生产构建

```bash
yarn build
yarn start
```

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3001/api`

### 端点列表

#### 1. 翻译服务 (`/api/translate`)

##### 获取支持的翻译服务

```
GET /api/translate/services
```

响应示例：
```json
{
  "success": true,
  "services": [
    {
      "value": "deepseek",
      "label": "DeepSeek",
      "docs": "https://api-docs.deepseek.com/",
      "apiKeyUrl": "https://platform.deepseek.com/api_keys"
    }
  ]
}
```

##### 单文本翻译

```
POST /api/translate
Content-Type: application/json

{
  "text": "Hello, world!",
  "targetLanguage": "zh",
  "sourceLanguage": "en",
  "translationMethod": "deepseek",
  "config": {
    "apiKey": "your-api-key",
    "model": "deepseek-chat",
    "temperature": 0.7
  },
  "useCache": true
}
```

响应示例：
```json
{
  "success": true,
  "result": "你好，世界！"
}
```

##### 测试翻译

```
POST /api/translate/test
Content-Type: application/json

{
  "translationMethod": "deepseek",
  "config": {
    "apiKey": "your-api-key"
  }
}
```

#### 2. 批量翻译 (`/api/batch-translate`)

##### 批量翻译

```
POST /api/batch-translate
Content-Type: application/json

{
  "texts": ["Hello", "World", "How are you?"],
  "targetLanguage": "zh",
  "sourceLanguage": "en",
  "translationMethod": "deepseek",
  "config": {
    "apiKey": "your-api-key",
    "maxConcurrent": 10
  },
  "enableProgress": false
}
```

响应示例：
```json
{
  "success": true,
  "results": ["你好", "世界", "你好吗？"],
  "errors": []
}
```

##### 异步批量翻译（带进度跟踪）

```
POST /api/batch-translate
Content-Type: application/json

{
  "texts": [...],
  "targetLanguage": "zh",
  "translationMethod": "deepseek",
  "config": {...},
  "enableProgress": true
}
```

响应示例：
```json
{
  "success": true,
  "jobId": "job_1234567890_abc123"
}
```

##### 查询任务状态

```
GET /api/batch-translate/jobs/{jobId}
```

响应示例：
```json
{
  "jobId": "job_1234567890_abc123",
  "status": "processing",
  "progress": 50,
  "result": null,
  "error": null,
  "createdAt": 1234567890000
}
```

#### 3. 文件上传 (`/api/upload`)

##### 上传字幕文件

```
POST /api/upload
Content-Type: multipart/form-data

file: <subtitle file>
fileType: "srt" (可选，自动检测)
```

响应示例：
```json
{
  "success": true,
  "fileType": "srt",
  "contentLines": ["第一行字幕", "第二行字幕"],
  "totalLines": 2
}
```

##### 上传并翻译字幕

```text
POST /api/upload/translate
Content-Type: multipart/form-data
```

默认输出双语 ASS（SRT/VTT 输入会转换为 ASS）：

```bash
curl -X POST http://localhost:3001/api/upload/translate \
  -F "file=@subtitle.srt" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=zh" \
  -F "translationMethod=gtxFreeAPI" \
  -o subtitle_bilingual.ass
```

设置 `outputFormat=json` 可返回 JSON 字幕数组。JSON 输出仅支持 SRT，且必须显式提供非 `auto` 的 `sourceLanguage`：

```bash
curl -X POST http://localhost:3001/api/upload/translate \
  -F "file=@subtitle.srt" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=zh" \
  -F "translationMethod=gtxFreeAPI" \
  -F "outputFormat=json"
```

响应中的语言字段由 `sourceLanguage` 和 `targetLanguage` 动态生成，时间戳直接取自 SRT 并保留三位毫秒：

```json
[
  {
    "start": "00:00:00,000",
    "end": "00:00:02,360",
    "en": "Steve Bannon, welcome to the insider.",
    "zh": "史蒂夫·班农，欢迎来到内部人士。"
  }
]
```

##### 生成双语字幕

```
POST /api/upload/bilingual
Content-Type: application/json

{
  "originalLines": ["Hello", "World"],
  "translatedLines": ["你好", "世界"],
  "fileType": "srt",
  "bilingualSubtitle": true
}
```

#### 4. 任务管理 (`/api/jobs`)

```
GET /api/jobs              # 获取所有任务列表
GET /api/jobs/{jobId}      # 获取任务详情
DELETE /api/jobs/{jobId}   # 删除任务
```

#### 5. 健康检查 (`/api/health`)

```
GET /api/health           # 基础健康检查
GET /api/health/info      # 详细服务器信息
```

## 支持的翻译服务

### 机器翻译 (MT)
- GTX API (Free)
- Google Translate
- DeepL
- Azure Translate
- DeepLX (Free)
- Qwen-MT

### LLM APIs
- DeepSeek
- OpenAI
- Claude
- Gemini
- Qwen (通义千问)
- Moonshot (Kimi)
- Zhipu GLM (智谱)
- Doubao (豆包)
- xAI (Grok)
- Mistral
- Perplexity

### 聚合服务 & 自托管
- OpenRouter
- Groq
- SiliconFlow
- Nvidia NIM
- Azure OpenAI
- Custom LLM

## 代码复用说明

本服务端模块复用了原项目以下代码：

### 直接复用
- `src/app/lib/translation/registry.ts` → `server/src/lib/translation/registry.ts`
- `src/app/lib/translation/languages-data.ts` → `server/src/lib/translation/languages-data.ts`
- `src/app/lib/translation/utils.ts` → `server/src/lib/translation/utils.ts`
- `src/app/lib/translation/types.ts` → `server/src/types/translation.ts`
- `src/app/lib/translation/config.ts` → `server/src/lib/translation/config.ts`

### 修改后复用
- `src/app/lib/translation/services/llm.ts` → `server/src/lib/translation/services/llm.ts`
  - 移除浏览器特定逻辑
- `src/app/lib/translation/services/traditional.ts` → `server/src/lib/translation/services/traditional.ts`
- `src/app/lib/translation/services/shared.ts` → `server/src/lib/translation/shared.ts`
  - 移除 `useLocalApi` 逻辑
- `src/app/lib/translation/cache.ts` → `server/src/lib/translation/cache.ts`
  - 将 IndexedDB 缓存改为 LRU 缓存
- `src/app/[locale]/subtitleUtils.ts` → `server/src/lib/subtitle/index.ts`
  - 字幕处理工具函数

## 开发注意事项

1. **不使用 "use client" 指令**：服务端代码不包含客户端特定标记
2. **环境变量**：使用 `process.env` 访问环境变量
3. **错误处理**：所有异步操作都包含错误处理
4. **日志记录**：使用 `console.log/error` 记录重要信息
5. **内存管理**：定期清理过期的缓存和任务

## 与原项目的集成

本服务端模块可以与原 Next.js 项目并行运行：

```
subtitle-translator/
├── src/                    # Next.js 前端项目
├── server/                 # 独立服务端模块（本模块）
│   ├── src/
│   ├── package.json
│   └── ...
├── package.json
└── ...
```

运行方式：

```bash
# 启动 Next.js 前端（端口 3000）
yarn dev

# 启动独立服务端（端口 3001）
cd server
yarn dev
```

前端可以通过 `http://localhost:3001/api` 调用服务端接口。

## 许可证

MIT
