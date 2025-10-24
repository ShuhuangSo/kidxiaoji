// 数据库初始化脚本
// 用于在应用启动时初始化数据库结构和默认数据

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// 数据库路径 - 从环境变量获取或使用默认路径
const DB_PATH = process.env.DB_PATH || './db/database.db';

// 创建表结构的函数
async function createTables(database) {
  // 创建用户表
  await database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('child', 'parent')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      avatar TEXT
    );
  `);
  
  // 创建积分表
  await database.run(`
    CREATE TABLE IF NOT EXISTS points (
      user_id INTEGER PRIMARY KEY,
      coins INTEGER DEFAULT 0,
      diamonds INTEGER DEFAULT 0,
      energy INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      last_streak_date TIMESTAMP,
      consecutive_missed_days INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  // 创建任务表
  await database.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      reward_type TEXT NOT NULL CHECK(reward_type IN ('coin', 'diamond')),
      reward_amount INTEGER NOT NULL,
      is_daily BOOLEAN DEFAULT true,
      recurrence TEXT NOT NULL CHECK(recurrence IN ('none', 'daily', 'weekly', 'monthly')) DEFAULT 'none',
      expiry_time TIMESTAMP,
      target_user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  
  // 创建用户任务关联表
  await database.run(`
    CREATE TABLE IF NOT EXISTS user_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'missed')),
      completed_at TIMESTAMP,
      assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      needs_approval BOOLEAN DEFAULT true,
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(user_id, task_id, assigned_date)
    );
  `);
  
  // 创建奖励商店表
  await database.run(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cost_type TEXT NOT NULL CHECK(cost_type IN ('coin', 'diamond')),
      cost_amount INTEGER NOT NULL,
      icon TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // 创建用户兑换记录表
  await database.run(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reward_id INTEGER NOT NULL,
      redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
    );
  `);

  // 创建用户奖励通知表
  await database.run(`
    CREATE TABLE IF NOT EXISTS user_reward_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date_reward_id INTEGER,
      reward_type TEXT NOT NULL CHECK(reward_type IN ('coins', 'diamonds', 'energy', 'product')),
      reward_amount INTEGER,
      product_id INTEGER,
      notification_date TIMESTAMP NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (date_reward_id) REFERENCES date_rewards(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES rewards(id) ON DELETE SET NULL
    );
  `);

  // 创建积分变动历史表
  await database.run(`
    CREATE TABLE IF NOT EXISTS point_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      point_type TEXT NOT NULL CHECK(point_type IN ('coin', 'diamond', 'energy')),
      change_amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      related_id INTEGER,
      related_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  // 创建系统设置表
  await database.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// 初始化默认数据
async function initializeDefaultData(database) {
  // 检查是否已有用户数据
  const usersCount = await database.get('SELECT COUNT(*) as count FROM users');
  
  if (usersCount.count === 0) {
    console.log('初始化默认用户数据...');
    
    // 创建默认用户
    const adminId = await database.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['admin', 'admin123', 'parent'] // 简化示例
    );
    
    const childId = await database.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['xiaoming', '123456', 'child'] // 简化示例
    );
    
    // 添加测试用户
    const testChildId = await database.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['testuser', 'test123', 'child'] // 测试账号
    );
    
    // 初始化积分数据
    const today = new Date().toISOString();
    await database.run(
      'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [childId.lastID, 1000, 50, 0, 5, 3, today, 0]
    );
    
    // 为测试用户初始化积分数据
    await database.run(
      'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [testChildId.lastID, 800, 30, 0, 3, 1, today, 0]
    );
    
    // 创建示例任务
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0); // 设置为明天晚上8点
    
    const tasks = [
      ['完成数学作业', '完成课本第35-36页的练习题', 'diamond', 5, false, 'none', tomorrow.toISOString(), null],
      ['打扫自己的房间', '整理床铺、扫地、擦桌子', 'coin', 100, false, 'none', tomorrow.toISOString(), null],
      ['户外运动30分钟', '跳绳、跑步或球类运动', 'coin', 80, false, 'none', null, null],
      ['阅读课外书', '每天阅读至少20分钟', 'diamond', 3, true, 'daily', null, null],
      ['帮助父母做饭', '协助准备一顿简单的饭菜', 'coin', 120, false, 'none', null, null]
    ];
    
    for (const task of tasks) {
      await database.run(
        'INSERT INTO tasks (title, description, reward_type, reward_amount, is_daily, recurrence, expiry_time, target_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        task
      );
    }
    
    // 为孩子用户分配今天的任务
    const taskRows = await database.all('SELECT id FROM tasks');
    const todayDate = new Date().toISOString().split('T')[0]; // 获取今天的日期（YYYY-MM-DD）
    
    for (const task of taskRows) {
      await database.run(
        'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
        [childId.lastID, task.id, 'pending', todayDate]
      );
    }
    
    // 创建示例奖励
    const rewards = [
      ['游戏时间', '30分钟电子游戏时间', 'diamond', 10, '🎮'],
      ['新玩具', '选择一个喜欢的玩具', 'diamond', 50, '🧸'],
      ['披萨晚餐', '外出吃披萨晚餐', 'diamond', 30, '🍕'],
      ['神秘盲盒', '随机奖励', 'diamond', 15, '🎁']
    ];
    
    for (const reward of rewards) {
      await database.run(
        'INSERT INTO rewards (name, description, cost_type, cost_amount, icon) VALUES (?, ?, ?, ?, ?)',
        reward
      );
    }
  }
  
  // 检查是否已有系统设置数据
  const settingsCount = await database.get('SELECT COUNT(*) as count FROM system_settings');
  
  if (settingsCount.count === 0) {
    console.log('初始化默认系统设置...');
    // 初始化默认系统设置
    const defaultSettings = [
      ['daily_reward_enabled', 'true', '是否启用每日奖励'],
      ['daily_reward_coins', '50', '每日奖励硬币数量'],
      ['daily_reward_diamonds', '5', '每日奖励钻石数量'],
      ['max_streak_bonus_multiplier', '2', '最大连续签到奖励倍数'],
      ['energy_regen_rate', '5', '能量回复速率(分钟)'],
      ['max_energy', '100', '最大能量值'],
      ['streak_reset_days', '3', '连续签到重置天数'],
      ['multiplier_effect_duration_hours', '6', '积分翻倍效果持续时间(小时)'],
      ['multiplier_effect_duration_minutes', '0', '积分翻倍效果持续时间(分钟)']
    ];
    
    for (const setting of defaultSettings) {
      await database.run(
        'INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)',
        setting
      );
    }
  }
}

// 执行初始化
async function initDatabase() {
  console.log(`正在初始化数据库: ${DB_PATH}`);
  
  try {
    // 打开数据库连接
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    // 创建表结构
    await createTables(db);
    
    // 初始化默认数据
    await initializeDefaultData(db);
    
    // 关闭数据库连接
    await db.close();
    
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, createTables };