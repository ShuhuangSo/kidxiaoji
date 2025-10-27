#!/bin/bash

# 全面依赖修复脚本
# 当 node_modules 目录中缺少必要文件时使用

echo "=============================================="
echo "开始全面依赖修复..."
echo "=============================================="

# 1. 检查 Node.js 和 npm 版本
echo "\n[1/6] 检查 Node.js 和 npm 版本..."
node -v
npm -v

# 2. 清理 npm 缓存
echo "\n[2/6] 清理 npm 缓存..."
npm cache clean --force

# 3. 清理现有的 node_modules 和 lock 文件
echo "\n[3/6] 清理项目目录..."
if [ -d "node_modules" ]; then
    echo "删除 node_modules 目录..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "删除 package-lock.json 文件..."
    rm -f package-lock.json
fi

if [ -f "yarn.lock" ]; then
    echo "删除 yarn.lock 文件..."
    rm -f yarn.lock
fi

# 4. 创建临时的 npm 配置以优化安装
echo "\n[4/6] 配置 npm 安装参数..."
npm config set legacy-peer-deps true
npm config set audit false
npm config set progress false

# 5. 安装项目依赖
echo "\n[5/6] 重新安装项目依赖..."
echo "注意：这可能需要几分钟时间，请耐心等待..."

# 尝试使用不同的安装策略
install_strategies=(
    "npm install"
    "npm install --legacy-peer-deps"
    "npm install --force"
    "npm install --ignore-scripts"
)

install_success=false
for strategy in "${install_strategies[@]}"; do
    echo "\n尝试安装策略: $strategy"
    $strategy
    if [ $? -eq 0 ]; then
        echo "✓ 依赖安装成功!"
        install_success=true
        break
    else
        echo "✗ 安装失败，尝试下一个策略..."
    fi
done

# 6. 验证安装结果
echo "\n[6/6] 验证安装结果..."

if [ "$install_success" = true ]; then
    # 检查 node_modules 目录是否存在
    if [ -d "node_modules/.bin" ]; then
        echo "✓ node_modules/.bin 目录已创建"
        
        # 检查 next 命令是否存在
        if [ -f "node_modules/.bin/next" ]; then
            echo "✓ Next.js 命令已正确安装"
            echo "\n=============================================="
            echo "🎉 依赖修复成功！"
            echo "\n您现在可以运行以下命令："
            echo "   ./node_modules/.bin/next build  # 构建项目"
            echo "   ./node_modules/.bin/next start  # 启动应用"
            echo "=============================================="
        else
            echo "✗ Next.js 命令仍然不存在"
            echo "\n尝试备选方案：全局安装 Next.js"
            npm install -g next
            if [ $? -eq 0 ]; then
                echo "✓ 全局安装 Next.js 成功"
                echo "\n您现在可以运行："
                echo "   next build  # 构建项目"
                echo "   next start  # 启动应用"
            fi
        fi
    else
        echo "✗ node_modules/.bin 目录未创建"
        echo "\n严重错误：npm 安装未能正确创建必要文件"
    fi
else
    echo "✗ 所有安装策略均失败！"
    echo "\n尝试以下备选方案："
    echo "1. 手动全局安装必要包："
    echo "   npm install -g next react react-dom"
    echo "\n2. 或者尝试使用 npx："
    echo "   npx next build"
    echo "   npx next start"
fi

# 7. 创建详细的故障排除指南
echo "\n创建故障排除指南..."
cat > dependency-troubleshooting.md << 'EOL'
# npm 依赖安装故障排除指南

## 问题分析
当尝试运行 `./node_modules/.bin/next build` 时出现 "没有那个文件或目录" 错误，说明：
1. npm 依赖未正确安装
2. node_modules 目录中缺少必要文件

## 解决方案

### 方案 1：清理并重新安装（推荐）
```bash
# 清理缓存
npm cache clean --force

# 删除旧依赖
rm -rf node_modules package-lock.json

# 使用 legacy-peer-deps 避免依赖冲突
npm install --legacy-peer-deps
```

### 方案 2：使用 npx 直接运行
```bash
# 不需要本地安装，使用 npx 从远程获取
npx next build
npx next start
```

### 方案 3：全局安装核心包
```bash
# 全局安装必要的包
npm install -g next react react-dom

# 然后构建
next build
next start
```

### 方案 4：使用不同的 npm 版本
如果您使用的 Node.js 版本与项目不兼容，尝试：
```bash
# 安装 nvm（Node Version Manager）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# 重启终端后，安装兼容的 Node.js 版本
nvm install 16
nvm use 16

# 然后重新安装依赖
npm install
```

## 常见问题

### 内存不足
如果服务器内存不足，尝试：
```bash
# 增加交换空间
sudo dd if=/dev/zero of=/swapfile bs=1G count=2
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 网络问题
如果 npm 安装失败，可能是网络问题：
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
```

### 文件权限
确保当前用户有足够权限：
```bash
# 检查并修改项目目录权限
chown -R $(whoami) .
```

## 验证安装
```bash
# 检查 node_modules 是否存在
ls -la node_modules

# 检查 next 命令是否存在
ls -la node_modules/.bin/next

# 验证版本
./node_modules/.bin/next --version
```
EOL

echo "故障排除指南已创建：dependency-troubleshooting.md"
echo "\n=============================================="
echo "脚本执行完成！请查看上面的结果和指南。"
echo "=============================================="