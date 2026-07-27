.PHONY: build rebuild

# 构建 Docker 镜像（使用缓存）
build:
	docker compose -f docker-compose.yml build

# 不使用缓存，重新构建 Docker 镜像
rebuild:
	docker compose -f docker-compose.yml build --no-cache
