import { getDatabase } from './db';

async function initSpecialEffectsTable() {
  try {
    const db = await getDatabase();
    
    console.log('开始初始化special_effects表...');
    
    // 创建special_effects表（如果不存在）
    await db.run(`
      CREATE TABLE IF NOT EXISTS special_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        effect_type TEXT NOT NULL,
        point_type TEXT NOT NULL CHECK(point_type IN ('coin', 'diamond', 'energy')),
        multiplier REAL NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        description TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log('special_effects表初始化完成！');
    
    // 添加索引以提高查询性能
    await db.run('CREATE INDEX IF NOT EXISTS idx_special_effects_user_id ON special_effects(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_special_effects_end_time ON special_effects(end_time)');
    
    console.log('索引创建完成！');
    
  } catch (error) {
    console.error('初始化special_effects表失败:', error);
  }
}

// 执行初始化
initSpecialEffectsTable();