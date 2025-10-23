import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// 直接打开数据库连接
async function openDB() {
  const dbPath = path.join(process.cwd(), 'database.db');
  console.log(`使用数据库路径: ${dbPath}`);
  return await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initLuckyBoxTable() {
  try {
    const db = await openDB();
    
    console.log('开始初始化lucky_box_items表...');
    
    // 创建lucky_box_items表（如果不存在）
    await db.run(`
      CREATE TABLE IF NOT EXISTS lucky_box_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lucky_box_id INTEGER NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('points', 'product')),
        item_value INTEGER NOT NULL,
        item_detail TEXT,
        probability REAL NOT NULL CHECK(probability > 0 AND probability <= 100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lucky_box_id) REFERENCES rewards(id) ON DELETE CASCADE,
        FOREIGN KEY (item_value) REFERENCES rewards(id) ON DELETE CASCADE
      );
    `);
    
    console.log('lucky_box_items表初始化完成！');
    
    // 添加索引以提高查询性能
    await db.run('CREATE INDEX IF NOT EXISTS idx_lucky_box_items_lucky_box_id ON lucky_box_items(lucky_box_id)');
    
    console.log('索引创建完成！');
    
    // 更新rewards表，确保有is_lucky_box字段
    const tableInfo = await db.all('PRAGMA table_info(rewards)');
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('is_lucky_box')) {
      console.log('添加is_lucky_box字段到rewards表...');
      await db.run('ALTER TABLE rewards ADD COLUMN is_lucky_box BOOLEAN DEFAULT false');
    }
    
    if (!columnNames.includes('is_hidden')) {
      console.log('添加is_hidden字段到rewards表...');
      await db.run('ALTER TABLE rewards ADD COLUMN is_hidden BOOLEAN DEFAULT false');
    }
    
    console.log('rewards表更新完成！');
    
  } catch (error) {
    console.error('初始化lucky_box_items表失败:', error);
  }
}

// 执行初始化
initLuckyBoxTable();