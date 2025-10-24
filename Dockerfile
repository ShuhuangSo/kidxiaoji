# 构建阶段
FROM node:20-alpine AS builder

# 增加内存限制，避免构建时OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 优化npm配置
RUN npm config set progress=true && \
    npm config set loglevel=http

# 安装依赖（使用--legacy-peer-deps避免peer dependency冲突）
RUN echo "开始安装依赖..." && \
    npm install --legacy-peer-deps --verbose

# 复制源代码
COPY . .

# 构建应用（增加详细输出）
RUN echo "开始构建应用..." && \
    npm run build --verbose

# 生产阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 创建数据库目录并设置权限
RUN mkdir -p /app/db && chown -R node:node /app/db

# 切换到非root用户
USER node

# 暴露应用端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]