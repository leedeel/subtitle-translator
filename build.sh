#!/bin/bash

# Subtitle Translator Docker 镜像构建脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
BUILD_FRONTEND=false
BUILD_SERVER=true
PUSH=false
CLEAN=false
TAG_PREFIX=""
REGISTRY=""

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -f, --frontend        仅构建前端镜像"
    echo "  -s, --server          仅构建服务端镜像"
    echo "  -p, --push            构建后推送到镜像仓库"
    echo "  -c, --clean           构建前清理旧镜像"
    echo "  -t, --tag PREFIX      镜像标签前缀 (如: myregistry.com/subtitle)"
    echo "  -h, --help            显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                          # 构建所有镜像"
    echo "  $0 -f                       # 仅构建前端"
    echo "  $0 -s -t registry.io/sub    # 构建服务端并添加标签前缀"
    echo "  $0 -c -p                    # 清理旧镜像，构建所有并推送"
    echo ""
    echo "构建后的镜像标签:"
    echo "  前端: ${TAG_PREFIX}subtitle-translator-frontend:latest"
    echo "  服务端: ${TAG_PREFIX}subtitle-translator-server:latest"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--frontend)
            BUILD_SERVER=false
            shift
            ;;
        -s|--server)
            BUILD_FRONTEND=false
            shift
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -t|--tag)
            TAG_PREFIX="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    log_success "Docker 已安装: $(docker --version)"
}

# 清理旧镜像
clean_old_images() {
    log_info "清理旧镜像..."

    local frontend_image="${TAG_PREFIX}subtitle-translator-frontend"
    local server_image="${TAG_PREFIX}subtitle-translator-server"

    if docker images | grep -q "$frontend_image"; then
        log_info "删除旧的前端镜像: $frontend_image"
        docker rmi "$frontend_image:latest" 2>/dev/null || true
    fi

    if docker images | grep -q "$server_image"; then
        log_info "删除旧的服务端镜像: $server_image"
        docker rmi "$server_image:latest" 2>/dev/null || true
    fi

    log_success "清理完成"
}

# 构建前端镜像
build_frontend() {
    log_info "开始构建前端镜像..."

    local image_name="${TAG_PREFIX}subtitle-translator-frontend"

    if [ -f "Dockerfile" ]; then
        docker build -t "${image_name}:latest" \
            --build-arg DOCKER_BUILD=true \
            --progress=plain \
            .

        log_success "前端镜像构建完成: ${image_name}:latest"
    else
        log_error "前端 Dockerfile 不存在"
        exit 1
    fi
}

# 构建服务端镜像
build_server() {
    log_info "开始构建服务端镜像..."

    local image_name="${TAG_PREFIX}subtitle-translator-server"

    if [ -f "server/Dockerfile" ]; then
        docker build -t "${image_name}:latest" \
            -f server/Dockerfile \
            --progress=plain \
            ./server

        log_success "服务端镜像构建完成: ${image_name}:latest"
    else
        log_error "服务端 Dockerfile 不存在"
        exit 1
    fi
}

# 推送镜像
push_image() {
    log_info "推送镜像到仓库..."

    if [ -n "$TAG_PREFIX" ]; then
        local frontend_image="${TAG_PREFIX}subtitle-translator-frontend:latest"
        local server_image="${TAG_PREFIX}subtitle-translator-server:latest"

        if [ "$BUILD_FRONTEND" = true ]; then
            log_info "推送前端镜像..."
            docker push "$frontend_image"
        fi

        if [ "$BUILD_SERVER" = true ]; then
            log_info "推送服务端镜像..."
            docker push "$server_image"
        fi

        log_success "镜像推送完成"
    else
        log_warn "未指定镜像标签前缀 (-t)，跳过推送"
    fi
}

# 显示镜像信息
show_image_info() {
    log_info "构建的镜像信息:"
    docker images | grep "subtitle-translator"
}

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "  Subtitle Translator Docker 镜像构建"
    echo "=========================================="
    echo ""

    check_docker

    if [ "$CLEAN" = true ]; then
        clean_old_images
        echo ""
    fi

    if [ "$BUILD_FRONTEND" = true ]; then
        build_frontend
        echo ""
    fi

    if [ "$BUILD_SERVER" = true ]; then
        build_server
        echo ""
    fi

    if [ "$PUSH" = true ]; then
        push_image
        echo ""
    fi

    show_image_info

    echo ""
    log_success "所有镜像构建完成！"
    echo ""
    log_info "启动服务:"
    echo "  docker-compose up -d"
    echo ""
    log_info "或使用生产配置:"
    echo "  docker-compose -f docker-compose.prod.yml up -d"
    echo ""
}

# 执行主流程
main