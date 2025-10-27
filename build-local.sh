#!/bin/bash

# 本地构建脚本，避免Docker网络问题
echo "开始本地构建过程..."

# 检查Node.js版本
echo "检查Node.js版本..."
node -v
npm -v

# 清理node_modules（如果存在）
if [ -d "node_modules" ]; then
  echo "清理现有的node_modules..."
  rm -rf node_modules
fi

# 安装依赖
echo "安装项目依赖..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
  echo "依赖安装失败，尝试使用--force选项..."
  npm install --force --legacy-peer-deps
  if [ $? -ne 0 ]; then
    echo "依赖安装失败，请检查错误信息。"
    exit 1
  fi
fi

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p db
mkdir -p public/avatars

# 构建应用
echo "构建应用..."
npm run build

if [ $? -ne 0 ]; then
  echo "构建失败，请检查错误信息。"
  exit 1
fi

echo "本地构建完成！您可以使用以下命令启动应用："
echo "npm start"
echo "或开发模式："
echo "npm run dev"