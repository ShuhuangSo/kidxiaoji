## 数据库同步指南

本文档详细说明如何在本地开发环境和服务器之间同步数据库数据，确保数据一致性。

## 1. 准备工作

### 1.1 环境要求

- 本地环境：确保安装了 `sqlite3` 命令行工具
- 服务器环境：确保已安装 Docker 和 Docker Compose
- 网络：确保本地可以通过 SSH/SCP 连接到服务器

## 2. 从本地导出数据库

### 2.1 使用导出脚本

项目根目录提供了自动导出脚本：

```bash
./export-db.sh
```

该脚本会自动：
1. 查找数据库文件（优先检查 `./database.db`）
2. 导出为带时间戳的 SQL 文件
3. 显示导出文件信息和后续导入步骤

### 2.2 手动导出（可选）

如果需要手动导出，可以使用以下命令：

```bash
# 导出数据库为SQL文件
sqlite3 ./database.db .dump > database_export_$(date +%Y%m%d_%H%M%S).sql
```

## 3. 将导出的SQL文件传输到服务器

### 3.1 使用SCP传输

```bash
# 将导出的SQL文件复制到服务器
scp database_export_[时间戳].sql user@your-server-ip:/path/to/project/
```

请根据实际情况替换：
- `database_export_[时间戳].sql`：导出的SQL文件名
- `user@your-server-ip`：服务器用户名和IP地址
- `/path/to/project/`：服务器上的项目路径

## 4. 在服务器上导入数据库

### 4.1 使用导入脚本

登录服务器后，在项目根目录执行：

```bash
# 使用导入脚本
./import-db.sh database_export_[时间戳].sql
```

该脚本会自动：
1. 停止正在运行的Docker服务
2. 备份当前数据库（如果存在）
3. 导入SQL文件
4. 设置正确的文件权限
5. 重启Docker服务
6. 检查服务状态

### 4.2 手动导入（可选）

如果需要手动导入，可以按照以下步骤：

```bash
# 停止服务
docker-compose down

# 备份当前数据库（可选）
cp ./database.db ./database_backup_$(date +%Y%m%d_%H%M%S).db

# 导入数据库
sqlite3 ./database.db < database_export_[时间戳].sql

# 设置正确的文件权限
chmod 644 ./database.db

# 重启服务
docker-compose up -d
```

## 5. 验证数据同步

### 5.1 检查服务状态

```bash
docker-compose ps
```

### 5.2 检查日志

```bash
docker-compose logs -f
```

### 5.3 访问应用

通过浏览器访问应用，确认数据是否正确同步。

## 6. 自动化同步方案

### 6.1 设置定时任务（可选）

如果需要定期同步数据，可以在本地设置crontab任务：

```bash
# 编辑crontab任务
crontab -e

# 添加以下内容（每天凌晨2点执行）
0 2 * * * cd /path/to/local/project && ./export-db.sh && scp database_export_*.sql user@server:/path/to/server/project/ && ssh user@server "cd /path/to/server/project && ./import-db.sh database_export_*.sql"
```

## 7. 注意事项

1. **数据冲突**：同步前请确保了解数据变更情况，避免数据冲突
2. **服务中断**：导入过程中服务会暂时中断，建议在非高峰期执行
3. **备份重要**：导入前务必备份当前数据库，以便在出现问题时恢复
4. **权限设置**：确保数据库文件有正确的读写权限
5. **版本兼容性**：确保本地和服务器的数据库结构兼容

## 8. 常见问题

### 8.1 导入失败

- 检查SQL文件是否完整
- 检查数据库文件权限
- 确认Docker服务是否正常运行

### 8.2 服务启动失败

- 查看Docker日志：`docker-compose logs -f`
- 检查数据库连接配置
- 确认数据库文件存在且权限正确

### 8.3 数据不一致

- 确保使用相同版本的数据库结构
- 检查导入/导出过程是否有错误
- 考虑在导入前清理服务器数据库（谨慎操作）