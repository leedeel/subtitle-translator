# ============ 构建阶段 ============
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./

# 清空 Docker daemon 注入的代理变量，避免 yarn 误连容器内的 127.0.0.1:7890
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV http_proxy=
ENV https_proxy=

# 【核心步骤】：在安装依赖前，切换为华为云 NPM 镜像源（国内访问稳定快速）
RUN yarn config set registry https://repo.huaweicloud.com/repository/npm/
RUN yarn install --frozen-lockfile --network-timeout 100000

COPY . .

# Docker 构建：使用 standalone 模式，启用本地 API
ENV DOCKER_BUILD=true
ENV NEXT_PUBLIC_USE_LOCAL_API=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# ============ 运行阶段 ============
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# 构建 & 运行命令:
# docker build -t subtitle-translator .
# docker run -d -p 3000:3000 --name subtitle-translator subtitle-translator