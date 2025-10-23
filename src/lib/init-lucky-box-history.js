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

// 初始化盲盒兑换历史表
async function initLuckyBoxHistoryTable() {
  try {
    const db = await openDB();
    
    console.log('开始初始化lucky_box_redemptions表...');
    
    // 创建盲盒兑换历史表
    await db.run(`
      CREATE TABLE IF NOT EXISTS lucky_box_redemptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        lucky_box_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_value INTEGER,
        is_special BOOLEAN DEFAULT false,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lucky_box_id) REFERENCES rewards(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES rewards(id) ON DELETE CASCADE
      );
    `);
    
    console.log('创建索引...');
    // 创建索引以提高查询性能
    await db.run('CREATE INDEX IF NOT EXISTS idx_lucky_box_redemptions_user ON lucky_box_redemptions(user_id);');
    await db.run('CREATE INDEX IF NOT EXISTS idx_lucky_box_redemptions_box ON lucky_box_redemptions(lucky_box_id);');
    
    console.log('lucky_box_redemptions表初始化完成！');
    
    // 关闭数据库连接
    await db.close();
  } catch (error) {
    console.error('初始化lucky_box_redemptions表失败:', error);
    throw error;
  }
}

// 直接执行初始化
initLuckyBoxHistoryTable().catch(console.error);

export { initLuckyBoxHistoryTable };