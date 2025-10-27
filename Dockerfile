# 使用完整的Node.js镜像以避免构建问题
FROM node:20

# 设置工作目录
WORKDIR /app

# 安装依赖和构建工具
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 设置Python路径
RUN ln -s /usr/bin/python3 /usr/bin/python

# 复制package.json和package-lock.json
COPY package*.json ./

# 设置环境变量
ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production

# 安装依赖（使用--no-optional可能会跳过一些有问题的可选依赖）
RUN npm install --production --legacy-peer-deps --no-audit --no-fund --no-optional

# 复制源代码和公共文件
COPY . .

# 创建数据库目录并设置权限
RUN mkdir -p /app/db && chmod -R 755 /app/db

# 构建应用
RUN npm run build

# 暴露应用端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]