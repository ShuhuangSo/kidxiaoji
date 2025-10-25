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

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 创建数据库目录并设置权限
RUN mkdir -p /app/db /app/database_data && chown -R node:node /app/db /app/database_data

# 注意：不在这里切换用户，而是在entrypoint脚本中处理
# 这样可以确保以root权限执行初始化步骤，正确设置数据库文件权限
# USER node

# 暴露应用端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]