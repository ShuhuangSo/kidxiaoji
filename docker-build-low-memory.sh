#!/bin/bash

# 低内存环境下的Docker构建脚本
set -e

echo "===== 开始低内存环境Docker构建 ====="

# 确保删除旧的构建缓存
echo "清理Docker构建缓存..."
docker builder prune -f

# 导出环境变量以优化内存使用
export NODE_OPTIONS="--max-old-space-size=384 --expose-gc --max-semi-space-size=128"
export NEXT_TELEMETRY_DISABLED=1

# 构建镜像，并使用--no-cache避免缓存问题
echo "开始构建Docker镜像..."

# 分阶段构建，先拉取基础镜像
docker pull node:20-slim || {
  echo "警告：无法拉取基础镜像，将使用本地缓存"
}

# 使用--memory限制构建容器的内存使用
docker build \
  --tag kid-growth-incentive-system-lowmem \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --no-cache \
  --progress plain \
  . || {
  echo "构建失败，尝试使用更严格的内存限制..."
  # 如果失败，尝试使用更保守的内存设置
  docker build \
    --tag kid-growth-incentive-system-lowmem \
    --no-cache \
    --progress plain \
    --build-arg NODE_OPTIONS="--max-old-space-size=256 --expose-gc --max-semi-space-size=64" \
    .
}

echo "===== 构建完成 ====="
echo "镜像名称: kid-growth-incentive-system-lowmem"

# 显示镜像大小
docker images kid-growth-incentive-system-lowmem

echo "\n提示：在低内存服务器上运行时，建议使用以下命令启动容器："
echo "docker run -d --memory=512m --memory-swap=768m -p 3000:3000 kid-growth-incentive-system-lowmem"
echo "\n如需进一步优化，可以考虑："
echo "1. 在next.config.js中禁用静态生成不需要的页面"
echo "2. 使用Vercel或Netlify等托管服务避免自行管理服务器资源"
echo "3. 考虑使用PM2并配置内存限制启动Node应用"