# ============ 构建阶段 ============
# 清空 Docker daemon 注入的代理变量，避免 yarn 误连容器内的 127.0.0.1:7890
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 复制 package 文件
COPY package.json yarn.lock ./

# 清空 Docker daemon 注入的代理变量，避免 yarn 误连容器内的 127.0.0.1:7890
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV http_proxy=
ENV https_proxy=

# 【核心步骤】：在安装依赖前，切换为华为云 NPM 镜像源（国内访问稳定快速）
RUN yarn config set registry https://repo.huaweicloud.com/repository/npm/

# 安装依赖
RUN yarn install --frozen-lockfile --network-timeout 100000

# 复制源代码
COPY . .

# 构建 TypeScript
RUN yarn build

# ============ 运行阶段 ============
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# 复制 package 文件和依赖
COPY package.json yarn.lock ./

# 清空 Docker daemon 注入的代理变量，避免 yarn 误连容器内的 127.0.0.1:7890
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV http_proxy=
ENV https_proxy=

# 【核心步骤】：在安装依赖前，切换为华为云 NPM 镜像源（国内访问稳定快速）
RUN yarn config set registry https://repo.huaweicloud.com/repository/npm/
RUN yarn install --frozen-lockfile --production --network-timeout 100000

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# 复制其他必要文件
COPY --chown=nodejs:nodejs swagger.js ./
COPY --chown=nodejs:nodejs .env.example ./

USER nodejs

EXPOSE 3001

ENV PORT=3001
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]