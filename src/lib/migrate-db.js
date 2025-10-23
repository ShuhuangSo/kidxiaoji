import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 数据库迁移脚本
async function migrateDatabase() {
  try {
    // 打开数据库连接
    const db = await open({
      filename: './database.db',
      driver: sqlite3.Database
    });
    
    console.log('开始数据库迁移...');
    
    // 1. 检查points表中是否已包含新字段
    const tableInfo = await db.all("PRAGMA table_info(points)");
    const columnNames = tableInfo.map(col => col.name);
    
    // 2. 如果字段不存在，则添加字段
    if (!columnNames.includes('last_streak_date')) {
      console.log('添加last_streak_date字段...');
      await db.run('ALTER TABLE points ADD COLUMN last_streak_date TIMESTAMP');
    }
    
    if (!columnNames.includes('consecutive_missed_days')) {
      console.log('添加consecutive_missed_days字段...');
      await db.run('ALTER TABLE points ADD COLUMN consecutive_missed_days INTEGER DEFAULT 0');
    }
    
    // 3. 为现有记录设置默认值并重置连胜天数
    const today = new Date().toISOString();
    console.log('更新现有记录的默认值...');
    await db.run('UPDATE points SET last_streak_date = ? WHERE last_streak_date IS NULL', [today]);
    await db.run('UPDATE points SET consecutive_missed_days = 0 WHERE consecutive_missed_days IS NULL');
    
    // 4. 重置连胜天数为合理值（解决显示17天的问题）
    console.log('重置连胜天数为合理值...');
    await db.run('UPDATE points SET streak_days = 0, consecutive_missed_days = 0');
    
    // 同步删除所有用户的连胜日期记录
    console.log('同步删除所有连胜日期记录...');
    await db.run('DELETE FROM user_streak_dates');    
    console.log('数据库迁移完成！');
    
    // 关闭数据库连接
    await db.close();
  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
}

// 执行迁移
migrateDatabase();