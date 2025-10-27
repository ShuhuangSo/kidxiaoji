# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖，优化内存使用和参数
RUN NODE_OPTIONS="--max-old-space-size=768" npm install --legacy-peer-deps --no-audit --no-fund

# 复制源代码
COPY . .

# 构建应用，优化内存使用
RUN NODE_OPTIONS="--max-old-space-size=768" npm run build

# 生产阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 确保构建产物和目录具有正确权限
RUN chown -R node:node /app && chmod -R 755 /app/.next

# 暂时保持为root用户运行，以便entrypoint可以处理权限问题
# 注意：生产环境中应考虑更安全的权限模型

# 暴露应用端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]