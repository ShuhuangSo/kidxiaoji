#!/bin/bash

# 设置错误时退出
set -e

# 定义颜色输出
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${GREEN}===== 开始部署 Kid Growth 应用 =====${NC}"

# 检查Docker是否正在运行
echo -e "${YELLOW}检查Docker状态...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 守护进程未运行，请先启动Docker${NC}"
    exit 1
fi

# 获取当前分支名称
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${GREEN}当前分支: $BRANCH${NC}"

# 拉取最新代码
echo -e "${YELLOW}拉取最新代码...${NC}"
git pull origin $BRANCH

# 检查必要的配置文件
echo -e "${YELLOW}检查配置文件...${NC}"
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}错误: docker-compose.yml 文件不存在${NC}"
    exit 1
fi

# 确保nginx配置目录存在
echo -e "${YELLOW}检查配置目录...${NC}"
mkdir -p nginx/conf.d
chmod 755 nginx/conf.d

if [ ! -f "nginx/conf.d/default.conf" ]; then
    echo -e "${RED}错误: nginx配置文件不存在${NC}"
    exit 1
fi

# 确保数据库目录存在
if [ ! -d "db" ]; then
    echo -e "${YELLOW}创建 db 目录...${NC}"
    mkdir -p db
    chmod 755 db
fi

# 创建其他必要目录
if [ ! -d "public/avatars" ]; then
    echo -e "${YELLOW}创建 public/avatars 目录...${NC}"
    mkdir -p public/avatars
    chmod 755 public/avatars
fi

# 检查数据库初始化脚本
if [ ! -f "db/init-database.sql" ]; then
    echo -e "${YELLOW}警告: 数据库初始化脚本不存在，首次启动时将无法初始化数据库${NC}"
fi

# 清理旧容器
echo -e "${YELLOW}清理旧容器和网络...${NC}"
docker-compose down --remove-orphans || true

# 构建并启动容器
echo -e "${GREEN}开始构建和启动容器...${NC}"
echo -e "${YELLOW}注意: 首次构建可能需要较长时间，请耐心等待...${NC}"

# 使用docker compose（无连字符格式）
if command -v docker compose &> /dev/null; then
    docker compose up -d --build
else
    # 回退到docker-compose（有连字符格式）
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build
    else
        echo -e "${RED}错误: 未找到 docker compose 或 docker-compose 命令${NC}"
        exit 1
    fi
fi

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
for i in {1..30}; do
    sleep 2
    echo -e "${YELLOW}等待中... ($i/30)${NC}"
    # 检查nginx是否正在运行
    if docker ps | grep -q "nginx"; then
        echo -e "${GREEN}Nginx 服务已启动${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}警告: Nginx 服务未能在预期时间内启动${NC}"
    fi
done

# 检查服务状态
echo -e "${GREEN}检查服务状态...${NC}"
if command -v docker compose &> /dev/null; then
    docker compose ps
else
    docker-compose ps
fi

# 显示服务日志摘要
echo -e "${GREEN}显示服务日志摘要...${NC}"
if command -v docker compose &> /dev/null; then
    echo -e "${YELLOW}=== APP 服务日志 ===${NC}"
    docker compose logs app --tail 20
    echo -e "${YELLOW}=== NGINX 服务日志 ===${NC}"
    docker compose logs nginx --tail 20
else
    echo -e "${YELLOW}=== APP 服务日志 ===${NC}"
    docker-compose logs app --tail 20
    echo -e "${YELLOW}=== NGINX 服务日志 ===${NC}"
    docker-compose logs nginx --tail 20
fi

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "请通过 ${YELLOW}http://服务器IP地址${NC} 访问服务"
echo -e "${YELLOW}如果遇到问题，请检查日志: docker compose logs${NC}"
echo -e "${GREEN}=======================================${NC}"