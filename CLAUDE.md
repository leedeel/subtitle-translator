# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
yarn dev                # Start Next.js dev server (localhost:3000)

# Build
yarn build              # Production build
yarn build:lang         # Build with language processing
yarn start               # Start production server (from build output)

# Linting
yarn lint               # Run ESLint

# Dependencies
yarn outdated            # Check for outdated packages
```

## Architecture Overview

This is a Next.js 16 application providing subtitle translation with support for multiple translation APIs and AI models. The app uses i18n (next-intl) with 17 locales.

### Translation System Architecture

The translation system is modularized under `src/app/lib/translation/`:

1. **Provider Registry** (`registry.ts`): Single source of truth for all translation providers. Adding a new service requires only editing `PROVIDERS` object:
   - Categories: `machine-translation`, `llm`, `aggregator`
   - Types: `openai-compat` (auto-generated via factory) or `custom` (hand-written)
   - Each provider defines defaults, endpoint, optional features (`allowCustomUrl`, `allowRelay`)

2. **Service Dispatch** (`services/index.ts`): Combines traditional APIs and LLM services into `translationServices` object

3. **Context-Aware Translation** (hooks `contextTranslation.ts`, `useTranslateData.tsx`):
   - For LLM models: Sends subtitles in batches with surrounding context (`[TRANSLATE_X]` and `[CONTEXT]` markers)
   - Automatically reduces context window on token limit failures
   - Key params: `batchSize` (lines per request), `contextWindow` (padding lines)

4. **Retry Logic** (`hooks/translation/retry.ts`):
   - Exponential backoff via `p-retry`
   - Auth errors (401/403) abort all concurrent requests immediately
   - Non-retryable errors: CORS hints, token limits, user-provided error messages

### Translation Flow

```
User Input → useTranslateData (hook)
         ↓
    validateTranslate() → testTranslation() (for certain APIs)
         ↓
    translateContent()
         ├─→ Context-Aware (LLM, multi-line) → translateWithContext()
         │      └─→ Batches with [TRANSLATE_X] markers → LLM API
         │             └─→ extractTranslatedLinesWithNumbers()
         │
         └─→ Line-by-line / Chunk-based (MT or single-line)
                └─→ retryTranslate() with pRetry/pLimit
```

### Caching Layer

**IndexedDB Storage** (`src/app/lib/storage/indexedDBStorage.ts`):
- Cache key format: `MD5(text + params)` → translation result
- Unlimited storage (bypasses browser localStorage limits)
- Used by all translation services when `useCache=true`

### API Routes & Proxy

**Local API Routes** (`src/app/api/`):
- Used in Docker/dev mode (`DOCKER_BUILD=true` or `NODE_ENV=development`)
- `/api/deepl` - DeepL proxy (handles auth key server-side)
- `/api/nvidia` - Nvidia NIM proxy (supports thinking params)

**External Relays** (`lib/translation/services/shared.ts`):
- Cloudflare Worker at `https://llm-proxy.aishort.top/api/{provider}`
- Used when provider has `allowRelay` and user enables "API Relay"
- Resolves CORS issues for DeepSeek, OpenAI, etc.

### Build Modes

Set by `next.config.ts`:
- **Docker** (`DOCKER_BUILD=true`): `output: "standalone"` - Enables API routes
- **Static Export** (default): `output: "export"` - Uses external EdgeOne proxies

## Key Patterns

### Adding a New Translation Provider

1. Edit `src/app/lib/translation/registry.ts` - add to `PROVIDERS`
2. If `openai-compat`: auto-registered by factory (no service file needed)
3. If `custom`: implement in `services/llm.ts` or `services/traditional.ts`
4. Update types in `src/app/lib/translation/types.ts` if new config fields needed

### Client-Side Translation

All translation calls go through `translationServices[method](params)` from `src/app/lib/translation/index.ts`. Services handle:
- Request formatting (headers, body)
- Response parsing (OpenAI-compat vs Claude vs Gemini shapes)
- Error throwing (non-OK responses become Error objects)

### Configuration Management

- Stored in `localStorage` via `useLocalStorage` hook
- Schema migration via `migrateConfig()` in `src/app/lib/translation/config.ts`
- Preserves user credentials (`apiKey`, `url`, `apiVersion`, `region`) on reset

### File Upload & Processing

**Subtitles** (`src/app/[locale]/subtitleUtils.ts`):
- Formats: `.srt`, `.ass`, `.vtt`, `.lrc`
- `detectSubtitleFormat()` - Auto-detects from content
- `filterSubLines()` - Extracts content lines, handles ASS styles separately
- **Bilingual mode**: Converts SRT/VTT to ASS format for dual-line positioning

## Important Notes

- **AbortController**: Shared across concurrent translations in `useTranslationProgress` - auth errors in one request abort all others
- **Progress updates**: Throttled for large batches (every 1% or 100 items) to reduce re-renders
- **React Compiler**: Enabled in `next.config.ts` (`reactCompiler: true`)
- **i18n**: Use `useTranslations()` hook; messages in `/messages/{locale}.json`