# Docker Compose 部署指南

本文档提供了使用 Docker Compose 在 Ubuntu 服务器上部署 kid-growth-incentive-system 项目的详细步骤。

## 1. 服务器准备工作

### 1.1 更新系统包

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 安装必要的系统依赖

```bash
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
```

## 2. 安装 Docker

### 2.1 添加 Docker GPG 密钥

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

### 2.2 添加 Docker 仓库

```bash
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
```

### 2.3 安装 Docker

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

### 2.4 验证 Docker 安装

```bash
sudo systemctl status docker
```

### 2.5 将当前用户添加到 docker 用户组（可选）

```bash
sudo usermod -aG docker ${USER}
```

**注意：** 执行此命令后需要注销并重新登录才能生效。

## 3. 安装 Docker Compose

### 3.1 下载 Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
```

### 3.2 设置执行权限

```bash
sudo chmod +x /usr/local/bin/docker-compose
```

### 3.3 验证 Docker Compose 安装

```bash
docker-compose --version
```

## 4. 项目部署

### 4.1 克隆项目代码

```bash
# 创建项目目录
mkdir -p ~/projects
cd ~/projects

# 克隆项目
git clone [你的仓库URL] kid-growth
cd kid-growth
```

### 4.2 准备配置文件

确保项目中包含以下文件：

1. **Dockerfile**：用于构建项目镜像
2. **docker-compose.yml**：定义服务配置，包含app和nginx服务
3. **nginx/conf.d/default.conf**：Nginx反向代理配置
4. **.env**（可选）：环境变量配置
5. **db/init-database.sql**：数据库初始化脚本

### 4.3 数据库同步和持久化

项目支持完整的数据库同步和持久化机制：

1. **数据库结构同步**：`db/init-database.sql` 包含完整的数据库表结构，会被提交到GitHub进行版本控制
2. **数据库文件持久化**：通过Docker卷映射将`./db`目录挂载到容器中，确保数据持久化
3. **自动初始化**：容器启动时会自动检查数据库文件，如果不存在则使用SQL脚本初始化
4. **数据一致性**：服务器通过git同步代码后，数据库结构将保持一致，实际数据通过卷映射持久化保存
5. **权限设置**：Dockerfile中已配置了适当的权限设置，将`/app`目录的所有权设置给node用户，确保应用能够正常访问和写入数据库文件，解决了SQLite数据库文件打开失败的问题

### 4.4 Nginx配置说明

Nginx服务已配置为：
- 监听80（HTTP）和443（HTTPS）端口
- 反向代理请求到Next.js应用
- 直接提供静态资源（如头像）以提高性 能
- 配置合理的缓存策略

### 4.5 服务器自动部署流程

项目提供了一键部署脚本，简化了部署流程：

```bash
# 使用自动部署脚本（推荐）
./deploy.sh

# 或者手动执行以下命令
# 1. 同步最新代码
git pull

# 2. 重新构建并启动服务（会自动处理数据库和配置）
docker-compose up -d --build
```

自动部署脚本会：
- 自动拉取当前分支的最新代码
- 检查并创建必要的配置目录
- 构建并启动所有服务（app和nginx）
- 检查服务状态并提供访问地址

服务启动后，通过以下地址访问：
- **主站点**：http://服务器IP地址
- 所有数据和配置都会自动处理，无需额外操作

### 4.6 构建和启动服务

```bash
# 在项目根目录执行
docker-compose up -d --build
```

### 4.4 验证服务状态

```bash
docker-compose ps
```

## 5. 数据持久化

当前的 `docker-compose.yml` 配置中，我们使用卷挂载将数据库文件保存在宿主机上，确保容器重启后数据不会丢失：

```yaml
volumes:
  - ./database.db:/app/database.db
  - ./db:/app/db
  - ./public/avatars:/app/public/avatars
```

### 5.1 数据库文件备份

要备份数据库文件，只需备份宿主机上的 `database.db` 文件：

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份数据库文件
tar -czvf ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).tar.gz ./database.db
```

## 6. 环境变量配置

### 6.1 创建 .env 文件

```bash
nano .env
```

### 6.2 必要的环境变量

根据项目需求配置以下环境变量：

```
# 数据库路径
DATABASE_URL="./database.db"

# 会话密钥（用于安全性）
SECRET_KEY="your-secret-key-here-change-in-production"

# 其他必要的环境变量
```

### 6.3 在 docker-compose.yml 中引用环境变量

修改 `docker-compose.yml` 文件，添加环境变量：

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=./database.db
  - SECRET_KEY=your-secret-key-here-change-in-production
```

或者使用 `.env` 文件：

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=${DATABASE_URL:-./database.db}
  - SECRET_KEY=${SECRET_KEY:-your-secret-key-here}
```

## 7. 配置 Nginx 作为反向代理（可选）

### 7.1 安装 Nginx

```bash
sudo apt install -y nginx
```

### 7.2 配置 Nginx 站点

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/kid-growth
```

添加以下配置（替换 `your-domain.com` 为实际域名）：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.3 启用站点配置

```bash
sudo ln -s /etc/nginx/sites-available/kid-growth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 8. 配置防火墙

```bash
sudo ufw allow 'Nginx HTTP'
sudo ufw allow 22/tcp  # 允许 SSH 连接
sudo ufw enable
```

## 9. 部署后验证

### 9.1 检查容器状态

```bash
docker-compose ps
docker-compose logs -f
```

### 9.2 访问网站

在浏览器中访问 `http://your-server-ip:3000`（或通过配置的域名），验证网站是否正常运行。

## 10. 维护和更新

### 10.1 更新项目代码

```bash
# 拉取最新代码
git pull

# 重建并重启容器
docker-compose up -d --build
```

### 10.2 停止服务

```bash
docker-compose down
```

### 10.3 重启服务

```bash
docker-compose restart
```

### 10.4 查看容器日志

```bash
docker-compose logs -f
```

## 11. 数据备份策略

### 11.1 自动备份脚本

创建备份脚本：

```bash
nano ~/backup-db.sh
```

添加以下内容：

```bash
#!/bin/bash

# 定义备份路径和文件名
BACKUP_DIR="/home/ubuntu/backups"
PROJECT_DIR="/home/ubuntu/projects/kid-growth"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"

# 创建备份目录（如果不存在）
mkdir -p $BACKUP_DIR

# 停止服务
docker-compose -f $PROJECT_DIR/docker-compose.yml down

# 备份数据库文件
tar -czvf $BACKUP_FILE -C $PROJECT_DIR database.db

# 重启服务
docker-compose -f $PROJECT_DIR/docker-compose.yml up -d

# 删除 30 天前的备份文件
find $BACKUP_DIR -name "db_backup_*.tar.gz" -mtime +30 -delete

echo "备份完成: $BACKUP_FILE"
```

设置脚本权限并执行：

```bash
chmod +x ~/backup-db.sh
~/backup-db.sh
```

### 11.2 设置自动备份任务

使用 crontab 设置每日自动备份：

```bash
crontab -e
```

添加以下内容（每天凌晨 2 点执行备份）：

```
0 2 * * * ~/backup-db.sh >> ~/backup.log 2>&1
```

## 12. 故障排除

### 12.1 常见问题及解决方案

1. **容器无法启动**
   - 检查日志：`docker-compose logs -f`
   - 确保端口没有被占用：`sudo lsof -i :3000`

2. **数据库连接错误**
   - 检查卷挂载是否正确
   - 验证数据库文件权限

3. **502 Bad Gateway 错误（使用 Nginx）**
   - 确认容器正在运行：`docker-compose ps`
   - 检查反向代理配置

4. **Docker Compose 命令错误**
   - 确保在正确的目录下执行命令
   - 验证 docker-compose.yml 文件格式正确

---

本文档提供了使用 Docker Compose 在 Ubuntu 服务器上部署 kid-growth-incentive-system 项目的完整流程。根据实际环境需求，可能需要调整某些配置参数。