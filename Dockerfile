# 第一阶段：构建阶段
FROM node:20-slim as builder

# 设置工作目录
WORKDIR /app

# 安装最小化的构建依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 设置Python路径
RUN ln -s /usr/bin/python3 /usr/bin/python

# 复制package.json和package-lock.json
COPY package*.json ./

# 设置环境变量以优化内存使用
ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512 --expose-gc"
ENV NEXT_TELEMETRY_DISABLED=1

# 安装依赖（最小化安装）
RUN npm install --production --legacy-peer-deps --no-audit --no-fund --no-optional

# 复制源代码（忽略node_modules等大型目录）
COPY . .

# 创建数据库目录并设置权限
RUN mkdir -p /app/db && chmod -R 755 /app/db

# 构建应用（禁用lint和类型检查）
RUN npm run build -- --no-lint

# 第二阶段：生产阶段（使用更轻量的基础镜像）
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=384"
ENV NEXT_TELEMETRY_DISABLED=1

# 复制构建结果和必要文件
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/public /app/public
COPY --from=builder /app/db /app/db

# 清理不必要的文件以减小镜像大小
RUN rm -rf /app/node_modules/.cache && \
    find /app/node_modules -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js.map" -o -name "*.ts.map" | xargs rm -f

# 暴露应用端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]