# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 复制数据库初始化脚本
COPY --from=builder /app/src/lib/init-database.js ./src/lib/init-database.js

# 创建数据库目录并设置适当的权限
RUN mkdir -p /app/db && chown -R node:node /app/db && chmod -R 775 /app/db

# 保持使用root用户以避免权限问题
# USER node

# 暴露应用端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 启动命令 - 先初始化数据库，再启动应用
CMD node /app/src/lib/init-database.js && npm start