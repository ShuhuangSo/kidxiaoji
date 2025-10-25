#!/bin/bash

# 数据库导入脚本 - 将SQL文件导入到Docker容器中的数据库

echo "======================================="
echo "开始导入数据库..."
echo "======================================="

# 检查参数
if [ $# -ne 1 ]; then
    echo "错误: 请提供SQL导入文件路径"
    echo "使用方法: ./import-db.sh <sql-file-path>"
    exit 1
fi

SQL_FILE="$1"
DB_PATH="./database.db"

# 检查SQL文件是否存在
if [ ! -f "$SQL_FILE" ]; then
    echo "错误: SQL文件不存在: $SQL_FILE"
    exit 1
fi

# 检查sqlite3是否安装
if ! command -v sqlite3 &> /dev/null; then
    echo "错误: sqlite3命令未找到，请先安装sqlite3"
    exit 1
fi

# 检查Docker服务是否运行
if ! docker ps &> /dev/null; then
    echo "错误: Docker服务未运行，请先启动Docker"
    exit 1
fi

# 停止运行中的容器以避免数据库锁定
echo "停止服务中..."
docker-compose down

# 备份当前数据库（如果存在）
if [ -f "$DB_PATH" ]; then
    BACKUP_FILE="./database_backup_$(date +%Y%m%d_%H%M%S).db"
    echo "备份当前数据库到: $BACKUP_FILE"
    cp "$DB_PATH" "$BACKUP_FILE"
fi

# 导入数据库
echo "正在导入数据库文件: $SQL_FILE"
sqlite3 "$DB_PATH" < "$SQL_FILE"

# 设置正确的文件权限
echo "设置文件权限..."
chmod 644 "$DB_PATH"

# 重新启动服务
echo "重启服务中..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo "======================================="
echo "数据库导入完成！"
echo "如果遇到问题，请检查日志: docker-compose logs"
echo "======================================="