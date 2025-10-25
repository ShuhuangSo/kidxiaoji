#!/bin/bash

# 数据库导出脚本 - 从SQLite数据库导出为SQL文件

echo "======================================="
echo "开始导出数据库..."
echo "======================================="

# 查找数据库文件
if [ -f "./database.db" ]; then
    DB_PATH="./database.db"
elif [ -f "./db/database.db" ]; then
    DB_PATH="./db/database.db"
else
    echo "错误: 未找到数据库文件"
    exit 1
fi

echo "找到数据库文件: $DB_PATH"

# 检查sqlite3是否安装
if ! command -v sqlite3 &> /dev/null; then
    echo "错误: sqlite3命令未找到，请先安装sqlite3"
    exit 1
fi

# 生成带时间戳的输出文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="database_export_${TIMESTAMP}.sql"

# 导出数据库
echo "正在导出数据库到文件: $OUTPUT_FILE"
sqlite3 "$DB_PATH" .dump > "$OUTPUT_FILE"

# 检查导出是否成功
if [ $? -eq 0 ]; then
    echo "数据库导出成功！"
    echo "文件位置: $OUTPUT_FILE"
    echo "文件大小: $(du -h "$OUTPUT_FILE" | cut -f1)"
    
    echo ""
    echo "======================================="
    echo "服务器导入步骤:"
    echo "1. 将此SQL文件上传到服务器: scp $OUTPUT_FILE user@server:/path/to/project/"
    echo "2. 连接到服务器: ssh user@server"
    echo "3. 切换到项目目录: cd /path/to/project/"
    echo "4. 执行导入: ./import-db.sh $OUTPUT_FILE"
    echo "======================================="
else
    echo "错误: 数据库导出失败"
    exit 1
fi