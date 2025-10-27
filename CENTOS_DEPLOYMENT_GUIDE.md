# CentOS 服务器部署指南

本文档提供了在 CentOS 服务器上不使用 Docker 直接部署 kid-growth-incentive-system 项目的详细步骤。

## 1. 服务器准备工作

### 1.1 更新系统包

```bash
sudo yum update -y
sudo yum upgrade -y
```

### 1.2 安装必要的系统依赖

```bash
sudo yum install -y git wget gcc-c++ make openssl-devel
```

## 2. 安装 Node.js

### 2.1 使用 NodeSource 仓库安装 Node.js 16.x（或项目需要的版本）

```bash
# 添加 NodeSource 仓库
sudo curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -

# 安装 Node.js
sudo yum install -y nodejs
```

### 2.2 验证 Node.js 和 npm 安装

```bash
node -v
npm -v
```

## 3. 安装 SQLite

```bash
sudo yum install -y sqlite-devel
```

## 4. 安装 Nginx

### 4.1 安装 Nginx

```bash
sudo yum install -y epel-release
sudo yum install -y nginx
```

### 4.2 启动 Nginx 并设置开机自启

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 5. 项目部署

### 5.1 创建项目目录

```bash
mkdir -p ~/projects
cd ~/projects
```

### 5.2 克隆项目代码

```bash
git clone [你的仓库URL] kid-growth
cd kid-growth
```

### 5.3 安装项目依赖

```bash
npm install
```

### 5.4 创建必要的目录

```bash
# 创建数据库目录
mkdir -p db

# 创建头像目录
mkdir -p public/avatars
```

### 5.5 配置环境变量（可选）

根据需要创建 `.env` 文件：

```bash
cp .env.example .env  # 如果有示例文件
# 编辑 .env 文件
```

### 5.6 构建项目

```bash
npm run build
```

## 6. 配置 Nginx 反向代理

### 6.1 创建 Nginx 配置文件

```bash
sudo vim /etc/nginx/conf.d/kid-growth.conf
```

### 6.2 添加以下配置（根据实际情况修改）

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 静态资源配置
    location /_next/static/ {
        alias /home/[用户名]/projects/kid-growth/.next/static/;
        expires 30d;
        access_log off;
    }

    # 头像图片直接提供
    location /avatars/ {
        alias /home/[用户名]/projects/kid-growth/public/avatars/;
        expires 30d;
        access_log off;
    }

    # API 路由和其他请求代理到 Next.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 错误处理
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### 6.3 测试 Nginx 配置

```bash
sudo nginx -t
```

### 6.4 重新加载 Nginx

```bash
sudo systemctl reload nginx
```

## 7. 配置 PM2 管理服务

### 7.1 安装 PM2

```bash
npm install -g pm2
```

### 7.2 使用 PM2 启动应用

```bash
cd ~/projects/kid-growth
npm run build
# 使用 PM2 启动应用
pm start
```

### 7.3 配置 PM2 开机自启

```bash
cd ~/projects/kid-growth
# 保存当前运行的应用到 PM2 启动列表
pm save
# 生成开机自启动脚本
pm startup systemd -u $(whoami) --hp $(pwd)
```

## 8. 数据库配置

### 8.1 初始化数据库

项目会自动初始化 SQLite 数据库。确保数据库目录存在且有写入权限：

```bash
chmod -R 755 ~/projects/kid-growth/db
chmod -R 755 ~/projects/kid-growth/public/avatars
```

### 8.2 数据导入（如果需要）

使用之前创建的数据库导入脚本：

```bash
# 在本地导出数据库
./export-db.sh

# 将导出的 SQL 文件上传到服务器
scp kid-database-[timestamp].sql [用户名]@[服务器IP]:~/projects/kid-growth/

# 在服务器上导入数据
cd ~/projects/kid-growth
./import-db.sh kid-database-[timestamp].sql
```

## 9. 配置防火墙

### 9.1 开放 80 端口

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### 9.2 如果需要 SSL（HTTPS），可以参考以下步骤

```bash
# 安装 Certbot
sudo yum install -y certbot python3-certbot-nginx

# 申请 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 10. 部署后验证

### 10.1 检查应用是否正常运行

```bash
# 查看 PM2 状态
pm list

# 查看应用日志
pm logs
```

### 10.2 访问网站

在浏览器中访问您的域名或服务器 IP 地址，验证网站是否正常加载。

## 11. 定期更新和维护

### 11.1 更新项目代码

```bash
cd ~/projects/kid-growth
git pull
npm install
npm run build
# 重启服务
pm2 restart
```

### 11.2 备份数据库

定期备份 SQLite 数据库文件：

```bash
cp ~/projects/kid-growth/db/database.db ~/backups/database_$(date +%Y%m%d_%H%M%S).db
```

## 12. 常见问题排查

### 12.1 应用无法启动
- 检查 Node.js 版本是否兼容
- 检查端口是否被占用：`sudo lsof -i :3000`
- 检查应用日志：`npm logs`

### 12.2 Nginx 配置错误
- 检查 Nginx 配置：`sudo nginx -t`
- 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`

### 12.3 数据库权限问题
- 确保数据库目录有正确的读写权限：`chmod -R 755 ~/projects/kid-growth/db`

### 12.4 静态资源访问问题
- 检查文件权限：`chmod -R 755 ~/projects/kid-growth/public`
- 验证 Nginx 配置中的路径是否正确

## 13. 性能优化建议

### 13.1 启用 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 13.2 配置静态资源缓存

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

### 13.3 监控和日志管理

定期清理日志文件，避免磁盘空间不足：

```bash
find /var/log -name "*.log" -type f -exec truncate -s 0 {} \;
```