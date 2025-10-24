# 使用Docker Compose部署项目（包含Nginx）

本文档提供了使用Docker Compose在Ubuntu服务器上部署项目的详细步骤，包含Nginx反向代理配置。

## 1. 服务器准备

确保您的Ubuntu服务器已更新：

```bash
sudo apt update
sudo apt upgrade -y
```

## 2. 安装Docker和Docker Compose

### 安装Docker

```bash
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install docker-ce -y

# 验证Docker安装
 sudo systemctl status docker
```

### 安装Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证Docker Compose安装
docker-compose --version
```

## 3. 项目部署

### 克隆项目代码

```bash
mkdir -p /opt/kid-growth
cd /opt/kid-growth
git clone [您的项目仓库URL] .
```

### 检查配置文件

确保以下文件存在：
- `docker-compose.yml`
- `Dockerfile`
- `nginx/conf.d/default.conf`

### 创建环境变量文件（如果需要）

如果项目需要环境变量，可以创建`.env`文件：

```bash
cp .env.example .env
# 根据需要编辑.env文件
sudo nano .env
```

### 构建和启动服务

```bash
docker-compose up -d --build
```

这将构建应用镜像并启动两个容器：
1. `app`: Next.js应用服务
2. `nginx`: Nginx反向代理服务

### 验证部署

检查服务是否正常运行：

```bash
docker-compose ps
```

您可以通过访问服务器的公共IP地址（http://[服务器IP]）来验证应用是否可以访问。

## 4. Nginx配置说明

Nginx配置文件位于`nginx/conf.d/default.conf`，主要功能包括：

- 监听80端口，将所有HTTP请求转发到Next.js应用（运行在app:3000）
- 针对静态资源（`/_next/static/`）和API请求（`/api/`）进行特殊处理
- 配置代理相关的HTTP头，确保正确的连接处理
- 提供50x错误页面

## 5. 数据持久化

项目使用Docker卷挂载实现数据持久化：
- `./db:/app/db`: 确保SQLite数据库文件在容器重启后仍然保留

## 6. 防火墙设置

如果您使用UFW防火墙，需要允许80端口的流量：

```bash
sudo ufw allow 80/tcp
sudo ufw reload
```

## 7. 数据备份策略

### 备份数据库

```bash
# 手动备份
sudo cp -r /opt/kid-growth/db /backup/db-$(date +%Y%m%d)

# 创建备份脚本
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/db-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
docker cp $(docker-compose -f /opt/kid-growth/docker-compose.yml ps -q app):/app/db "$BACKUP_DIR"
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"
EOF

sudo chmod +x /opt/backup-db.sh
```

### 设置定时任务

```bash
sudo crontab -e
```

添加以下行进行每日备份：

```
0 2 * * * /opt/backup-db.sh
```

## 8. 维护和更新

### 停止服务

```bash
docker-compose down
```

### 更新代码

```bash
git pull
docker-compose up -d --build
```

### 查看日志

```bash
docker-compose logs -f
```

## 9. 故障排除

### 常见问题

1. **应用无法访问**：检查Nginx和Next.js服务是否正常运行
   ```bash
   docker-compose ps
   docker-compose logs nginx
   docker-compose logs app
   ```

2. **数据库连接问题**：确保数据库卷挂载正确
   ```bash
   docker-compose exec app ls -la /app/db
   ```

3. **Nginx配置错误**：检查Nginx配置
   ```bash
   docker-compose exec nginx nginx -t
   ```

4. **权限问题**：确保文件权限正确
   ```bash
   sudo chown -R $USER:$USER /opt/kid-growth
   ```

## 10. 性能优化建议

1. **启用SSL/TLS**：可以通过修改Nginx配置添加HTTPS支持
2. **配置缓存**：为静态资源配置适当的缓存策略
3. **调整连接数**：根据需要修改Nginx的worker_connections配置

---

通过以上步骤，您应该能够在Ubuntu服务器上成功部署项目，并使用Nginx作为反向代理。如有任何问题，请参考相关日志进行故障排除。