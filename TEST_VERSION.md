# 测试版本镜像使用说明

## 📦 已构建的测试版本镜像

### 镜像信息

**版本标签**: `test-1aeef54` (基于 Git commit 1aeef54)

**构建的镜像**:

1. **前端应用** (`subtitle-translator:test-1aeef54`)
   - 大小: 349MB
   - 端口: 3000
   - 包含完整的 Next.js 前端应用

2. **服务端** (`subtitle-translator-server:test-1aeef54`)
   - 大小: 1.03GB
   - 端口: 3001
   - 包含翻译服务和文件处理功能

## 🚀 快速启动

### 方法 1: 使用 Docker Compose（推荐）

```bash
# 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 查看日志
docker-compose -f docker-compose.test.yml logs -f

# 停止服务
docker-compose -f docker-compose.test.yml down

# 停止并删除数据卷
docker-compose -f docker-compose.test.yml down -v
```

### 方法 2: 单独运行容器

**启动服务端**:
```bash
docker run -d \
  --name subtitle-translator-server-test \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e CORS_ORIGIN=* \
  subtitle-translator-server:test-1aeef54
```

**启动前端**:
```bash
docker run -d \
  --name subtitle-translator-frontend-test \
  -p 3000:3000 \
  subtitle-translator:test-1aeef54
```

## 🧪 测试功能

### 1. 健康检查

**服务端健康检查**:
```bash
curl http://localhost:3001/api/health
```

**前端应用检查**:
```bash
curl http://localhost:3000
```

### 2. 测试 JSON 输出功能

创建测试字幕文件 `test.srt`:
```srt
1
00:00:00,000 --> 00:00:02,360
Steve Bannon, welcome to the insider.

2
00:00:03,500 --> 00:00:05,080
2026
```

**测试 JSON 输出**:
```bash
curl -X POST http://localhost:3001/api/upload/translate \
  -F "file=@test.srt" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=zh" \
  -F "translationMethod=gtxFreeAPI" \
  -F "outputFormat=json"
```

**预期输出**:
```json
[
  {
    "start": "00:00:00,000",
    "end": "00:00:02,360",
    "en": "Steve Bannon, welcome to the insider.",
    "zh": "史蒂夫·班农，欢迎来到内部人士。"
  },
  {
    "start": "00:00:03,500",
    "end": "00:00:05,080",
    "en": "2026",
    "zh": "2026"
  }
]
```

### 3. 测试默认 ASS 输出

```bash
curl -X POST http://localhost:3001/api/upload/translate \
  -F "file=@test.srt" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=zh" \
  -F "translationMethod=gtxFreeAPI" \
  -o output.ass
```

## 📊 容器管理

### 查看运行状态
```bash
docker ps
docker-compose -f docker-compose.test.yml ps
```

### 查看日志
```bash
# 查看所有容器日志
docker-compose -f docker-compose.test.yml logs

# 查看特定服务日志
docker-compose -f docker-compose.test.yml logs -f frontend
docker-compose -f docker-compose.test.yml logs -f server

# 查看容器日志
docker logs subtitle-translator-server-test
docker logs subtitle-translator-frontend-test
```

### 进入容器调试
```bash
# 进入服务端容器
docker exec -it subtitle-translator-server-test sh

# 进入前端容器
docker exec -it subtitle-translator-frontend-test sh
```

## 🔧 配置说明

### 环境变量

**服务端环境变量**:
- `NODE_ENV`: 运行环境（production）
- `PORT`: 服务端口（3001）
- `CORS_ORIGIN`: CORS 允许的源（*）
- `CACHE_MAX_SIZE`: 缓存最大条目数（5000）
- `MAX_CONCURRENT_REQUESTS`: 最大并发请求数（20）
- `LLM_RELAY_BASE`: LLM 中转服务地址

### 代理配置

如需使用代理，在 `docker-compose.test.yml` 中取消注释：
```yaml
- HTTP_PROXY=http://host.docker.internal:7890
- HTTPS_PROXY=http://host.docker.internal:7890
```

### API 密钥配置

如需使用特定翻译服务，添加相应的 API 密钥：
```yaml
- DEEPSEEK_API_KEY=your_api_key_here
```

## 🐛 故障排查

### 容器无法启动
```bash
# 检查容器日志
docker logs subtitle-translator-server-test
docker logs subtitle-translator-frontend-test

# 检查端口占用
lsof -i :3000
lsof -i :3001
```

### 翻译服务错误
1. 检查服务端健康状态
2. 验证 API 密钥配置
3. 查看服务端日志排查错误

### 网络连接问题
1. 检查容器网络：`docker network ls`
2. 验证容器间连接：`docker network inspect subtitle-test-network`
3. 检查防火墙设置

## 📝 注意事项

1. **测试版本**: 这是基于 commit `1aeef54` 的测试版本，包含最新的 JSON 输出功能
2. **资源限制**: 默认设置了 CPU 和内存限制，可根据需要调整
3. **数据持久化**: 测试版本不包含数据持久化，重启容器会丢失缓存数据
4. **生产使用**: 如需生产部署，请使用 `latest` 标签的镜像和 `docker-compose.yml` 配置

## 🎯 下一步

1. 验证 JSON 输出功能是否符合预期
2. 测试不同字幕格式的转换
3. 验证多语言翻译功能
4. 测试并发请求性能
5. 根据测试结果调整配置参数

## 📞 支持

如有问题，请检查：
1. 容器日志：`docker logs <container_name>`
2. 健康检查端点：`http://localhost:3001/api/health`
3. API 文档：`http://localhost:3001/api/docs`（如已配置）

---

**构建日期**: 2026-07-28
**Git Commit**: 1aeef54
**分支**: server
