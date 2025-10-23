import { getDatabase } from './db';

async function updateRewardsTableForSpecialEffects() {
  try {
    const db = await getDatabase();
    
    console.log('开始更新rewards表以支持特殊商品...');
    
    // 检查并添加is_special_product字段
    const tableInfo = await db.all('PRAGMA table_info(rewards)');
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('is_special_product')) {
      console.log('添加is_special_product字段...');
      await db.run('ALTER TABLE rewards ADD COLUMN is_special_product BOOLEAN DEFAULT false');
    }
    
    if (!columnNames.includes('reward_point_type')) {
      console.log('添加reward_point_type字段...');
      await db.run('ALTER TABLE rewards ADD COLUMN reward_point_type TEXT CHECK(reward_point_type IN ("coin", "diamond", "energy"))');
    }
    
    if (!columnNames.includes('reward_multiplier')) {
      console.log('添加reward_multiplier字段...');
      await db.run('ALTER TABLE rewards ADD COLUMN reward_multiplier REAL DEFAULT 1.0');
    }
    
    console.log('rewards表更新完成！');
    
  } catch (error) {
    console.error('更新rewards表失败:', error);
  }
}

// 执行更新
updateRewardsTableForSpecialEffects();