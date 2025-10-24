#!/bin/bash

# 创建备份目录
echo "创建备份目录..."
mkdir -p test_scripts_backup

# 列出要移除的测试脚本文件
TEST_FILES=("add-*.js" "check-*.js" "test-*.js" "fix-*.js" "init-*.js" "clear-*.js" "verify-*.js" "delete_*.js" "unify-*.js" "update-*.js" "drop-*.js" "recreate-*.js" "create-*.js" "debug-*.js" "full-*.js" "detailed-*.js" "comprehensive-*.js" "direct-*.js" "simulate-*.js")

# 移动文件到备份目录
echo "开始备份测试脚本文件..."
for pattern in "${TEST_FILES[@]}"; do
  if ls $pattern 1> /dev/null 2>&1; then
    echo "备份: $pattern"
    mv $pattern test_scripts_backup/
  fi

done

# 检查备份目录大小
BACKUP_SIZE=$(du -sh test_scripts_backup | cut -f1)
echo "备份完成！备份目录大小: $BACKUP_SIZE"
echo "备份文件列表:"
ls -la test_scripts_backup/ | wc -l

# 显示保留的核心文件
echo "\n项目根目录保留的核心文件:"
ls -la | grep -v "^d" | grep -v "test_scripts_backup" | grep -v "cleanup_test_files.sh"