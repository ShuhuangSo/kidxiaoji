#!/bin/bash

# 简化的Docker构建脚本
echo "开始简化构建过程..."

# 创建临时的简化Dockerfile
cat > Dockerfile.temp << 'EOF'
# 使用完整的Node.js镜像，包含所有必要的构建工具
FROM node:20

# 设置工作目录
WORKDIR /app

# 安装基础构建依赖
RUN apt-get update && apt-get install -y build-essential python3

# 复制package.json和package-lock.json
COPY package*.json ./

# 使用yarn可能更稳定
RUN npm install -g yarn
RUN yarn install --frozen-lockfile --production

# 复制源代码
COPY . .

# 构建应用
RUN yarn build

# 创建数据库目录
RUN mkdir -p /app/db && chmod 777 /app/db

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["yarn", "start"]
EOF

echo "临时Dockerfile已创建，开始构建..."

# 使用简化的Dockerfile构建
docker build -t kid-app -f Dockerfile.temp .

echo "构建完成，清理临时文件..."
rm Dockerfile.temp

echo "简化构建脚本执行完毕。"