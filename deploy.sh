#!/bin/bash

set -e

echo "======================================="
echo "开始部署 Kid Growth Incentive System"
echo "======================================="

# 获取当前分支名称
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $BRANCH"

# 拉取最新代码
echo "正在拉取最新代码..."
git pull origin $BRANCH

# 确保nginx配置目录存在
echo "检查配置目录..."
mkdir -p nginx/conf.d

# 确保数据库目录存在
mkdir -p db

# 构建并启动Docker容器
echo "正在构建并启动容器..."
docker-compose up -d --build

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo "======================================="
echo "部署完成！"
echo "访问地址: http://服务器IP地址"
echo "======================================="