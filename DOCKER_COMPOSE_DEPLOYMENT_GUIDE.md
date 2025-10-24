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

### 4.4 Nginx配置说明

本项目使用Nginx作为前端代理服务器，主要功能包括：

1. 反向代理到Next.js应用
2. 静态资源缓存优化
3. 直接提供头像图片服务（支持防盗链）
4. API请求转发和超时控制
5. Gzip压缩支持
6. 安全头配置

Nginx配置文件位于`nginx/conf.d/default.conf`，已配置好所有必要的代理规则、缓存策略、超时控制和安全设置。配置包括了请求限制、缓冲区优化和详细的错误处理。

### 4.5 服务器自动部署流程

为了简化服务器部署流程，我们提供了`deploy.sh`一键部署脚本。使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```

该脚本会自动执行以下操作：
- 检查Docker运行状态
- 拉取最新代码
- 检查配置文件和目录结构
- 创建必要的目录（如数据库目录、头像目录）
- 清理旧容器和网络
- 构建并启动服务
- 等待服务启动并检查状态
- 显示服务日志摘要

脚本已优化，支持：
- 自动检测并使用`docker compose`或`docker-compose`命令
- 详细的彩色输出和错误提示
- 服务启动状态实时监控
- 完善的错误处理机制

部署完成后，可以通过`http://服务器IP地址`访问应用。

### 4.6 常见问题排查

#### 构建过程卡死

如果遇到构建过程卡死的情况，可以尝试以下解决方案：

1. 确保Docker有足够的内存资源（建议至少4GB）
2. 清理Docker缓存：`docker builder prune -a`
3. 使用`deploy.sh`脚本，它会自动清理旧容器
4. 检查网络连接是否稳定

#### 只有Nginx启动而App服务未启动

如果遇到只有Nginx服务启动而App服务未启动的情况：

1. 查看App服务日志：`docker compose logs app`
2. 检查数据库初始化脚本是否存在：`ls -la db/`
3. 确保Docker有足够的内存分配给App服务
4. 检查是否有端口冲突

#### 数据库初始化失败

如果数据库初始化失败：

1. 确保`db/init-database.sql`文件存在且格式正确
2. 检查数据库目录权限：`ls -la db/`
3. 手动尝试初始化：`sqlite3 db/database.db < db/init-database.sql`

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
  - ./db:/app/db
```

### 5.1 数据库文件备份

要备份数据库文件，只需备份宿主机上的 `db` 目录：

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份数据库文件
tar -czvf ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).tar.gz ./db/
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
DATABASE_URL="./db/database.db"

# 会话密钥（用于安全性）
SECRET_KEY="your-secret-key-here-change-in-production"

# 其他必要的环境变量
```

### 6.3 在 docker-compose.yml 中引用环境变量

修改 `docker-compose.yml` 文件，添加环境变量：

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=./db/database.db
  - SECRET_KEY=your-secret-key-here-change-in-production
```

或者使用 `.env` 文件：

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=${DATABASE_URL:-./db/database.db}
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
tar -czvf $BACKUP_FILE -C $PROJECT_DIR db/

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