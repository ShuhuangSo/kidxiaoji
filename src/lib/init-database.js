// 数据库初始化脚本
// 用于在应用启动时初始化数据库结构和默认数据

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// 数据库路径 - 从环境变量获取或使用默认路径
const DB_PATH = process.env.DB_PATH || './db/database.db';

// 创建表结构的函数
async function createTables(database) {
  try {
    // 创建用户表
    console.log('[表创建] 开始创建users表...');
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
    console.log('[表创建] users表创建成功');
  
  // 创建积分表
    console.log('[表创建] 开始创建points表...');
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
    console.log('[表创建] points表创建成功');
  
  // 创建任务表
    console.log('[表创建] 开始创建tasks表...');
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
    console.log('[表创建] tasks表创建成功');

    // 创建用户任务关联表
    console.log('[表创建] 开始创建user_tasks表...');
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
    console.log('[表创建] user_tasks表创建成功');
  
    // 创建奖励商店表
    console.log('[表创建] 开始创建rewards表...');
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
    console.log('[表创建] rewards表创建成功');
  
    // 创建用户兑换记录表
    console.log('[表创建] 开始创建redemptions表...');
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
    console.log('[表创建] redemptions表创建成功');

    // 创建用户奖励通知表
    console.log('[表创建] 开始创建user_reward_notifications表...');
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
    console.log('[表创建] user_reward_notifications表创建成功');

    // 创建积分变动历史表
    console.log('[表创建] 开始创建point_history表...');
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
    console.log('[表创建] point_history表创建成功');
  
    // 创建系统设置表
    console.log('[表创建] 开始创建system_settings表...');
    await database.run(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[表创建] system_settings表创建成功');
    console.log('[表创建] 所有数据库表创建完成');
  } catch (error) {
    console.error('[表创建] 创建数据库表时出错:', error.message);
    console.error('[表创建] 错误详情:', error.stack);
    // 继续抛出错误，让上层函数处理
    throw error;
  }
}

// 初始化默认数据
async function initializeDefaultData(database) {
  try {
    console.log('[默认数据] 开始检查和初始化默认数据...');
    
    // 检查是否已有用户数据
    console.log('[默认数据] 检查是否已存在用户数据...');
    const usersCount = await database.get('SELECT COUNT(*) as count FROM users');
    console.log(`[默认数据] 检测到用户数量: ${usersCount.count}`);
    
    if (usersCount.count === 0) {
      console.log('[默认数据] 初始化默认用户数据...');
      
      // 创建默认用户
      console.log('[默认数据] 创建默认管理员用户...');
      const adminId = await database.run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', 'admin123', 'parent'] // 简化示例
      );
      console.log(`[默认数据] 管理员用户创建成功，用户ID: ${adminId.lastID}`);
      
      console.log('[默认数据] 创建默认孩子用户...');
      const childId = await database.run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['xiaoming', '123456', 'child'] // 简化示例
      );
      console.log(`[默认数据] 孩子用户创建成功，用户ID: ${childId.lastID}`);
      
      // 添加测试用户
      console.log('[默认数据] 添加测试用户...');
      const testChildId = await database.run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['testuser', 'test123', 'child'] // 测试账号
      );
      console.log(`[默认数据] 测试用户创建成功，用户ID: ${testChildId.lastID}`);
      
      // 初始化积分数据
      console.log('[默认数据] 初始化积分数据...');
      const today = new Date().toISOString();
      await database.run(
        'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [childId.lastID, 1000, 50, 0, 5, 3, today, 0]
      );
      console.log(`[默认数据] 孩子用户积分数据初始化成功，用户ID: ${childId.lastID}`);
      
      // 为测试用户初始化积分数据
      await database.run(
        'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [testChildId.lastID, 800, 30, 0, 3, 1, today, 0]
      );
      console.log(`[默认数据] 测试用户积分数据初始化成功，用户ID: ${testChildId.lastID}`);
      
      // 创建示例任务
      console.log('[默认数据] 创建示例任务...');
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
        const taskResult = await database.run(
          'INSERT INTO tasks (title, description, reward_type, reward_amount, is_daily, recurrence, expiry_time, target_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          task
        );
        console.log(`[默认数据] 任务创建成功: ${task[0]} (ID: ${taskResult.lastID})`);
      }
      
      // 为孩子用户分配今天的任务
      console.log('[默认数据] 为孩子用户分配今天的任务...');
      const taskRows = await database.all('SELECT id FROM tasks');
      const todayDate = new Date().toISOString().split('T')[0]; // 获取今天的日期（YYYY-MM-DD）
      
      for (const task of taskRows) {
        await database.run(
          'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
          [childId.lastID, task.id, 'pending', todayDate]
        );
        console.log(`[默认数据] 任务分配成功: 任务ID ${task.id} 分配给用户ID ${childId.lastID}`);
      }
      
      // 创建示例奖励
      console.log('[默认数据] 创建示例奖励...');
      const rewards = [
        ['游戏时间', '30分钟电子游戏时间', 'diamond', 10, '🎮'],
        ['新玩具', '选择一个喜欢的玩具', 'diamond', 50, '🧸'],
        ['披萨晚餐', '外出吃披萨晚餐', 'diamond', 30, '🍕'],
        ['神秘盲盒', '随机奖励', 'diamond', 15, '🎁']
      ];
      
      for (const reward of rewards) {
        const rewardResult = await database.run(
          'INSERT INTO rewards (name, description, cost_type, cost_amount, icon) VALUES (?, ?, ?, ?, ?)',
          reward
        );
        console.log(`[默认数据] 奖励创建成功: ${reward[0]} (ID: ${rewardResult.lastID})`);
      }
    }
    
    // 检查是否已有系统设置数据
    console.log('[默认数据] 检查是否已存在系统设置数据...');
    const settingsCount = await database.get('SELECT COUNT(*) as count FROM system_settings');
    console.log(`[默认数据] 检测到系统设置数量: ${settingsCount.count}`);
    
    if (settingsCount.count === 0) {
      console.log('[默认数据] 初始化默认系统设置...');
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
        console.log(`[默认数据] 系统设置添加: ${setting[0]} = ${setting[1]} (${setting[2]})`);
      }
    }
    
    console.log('[默认数据] 默认数据初始化完成');
  } catch (error) {
    console.error('[默认数据] 初始化默认数据时出错:', error.message);
    console.error('[默认数据] 错误详情:', error.stack);
    throw error;
  }
}

const path = require('path');
const fs = require('fs');

// 执行初始化
async function initDatabase() {
  console.log(`[初始化开始] 时间: ${new Date().toISOString()}`);
  console.log(`[数据库路径] ${DB_PATH}`);
  
  try {
    // 检查数据库目录是否存在并可写
    const dbDir = path.dirname(DB_PATH);
    console.log(`[目录检查] 检查数据库目录: ${dbDir}`);
    
    if (!fs.existsSync(dbDir)) {
      console.log(`[目录检查] 数据库目录不存在，创建中...`);
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`[目录检查] 数据库目录创建成功`);
    } else {
      console.log(`[目录检查] 数据库目录已存在`);
    }
    
    // 检查目录权限
    console.log(`[权限检查] 检查目录权限...`);
    const stats = fs.statSync(dbDir);
    console.log(`[权限检查] 目录所有者UID: ${stats.uid}, GID: ${stats.gid}`);
    console.log(`[权限检查] 目录权限: ${stats.mode.toString(8)}`);
    
    // 确保目录可写
    if (!(stats.mode & fs.constants.W_OK)) {
      console.log('[权限检查] 修改数据库目录权限为可写');
      fs.chmodSync(dbDir, 0o755);
      console.log(`[权限检查] 修改目录权限为0755`);
    }
    
    // 检查数据库文件是否存在，如果存在则修改权限
    if (fs.existsSync(DB_PATH)) {
      try {
        fs.chmodSync(DB_PATH, 0o664);
        console.log(`[权限检查] 修改数据库文件权限为0664`);
      } catch (chmodError) {
        console.log(`[权限检查] 修改文件权限失败，但继续执行: ${chmodError.message}`);
      }
    }
    
    // 打开数据库连接
    console.log('[数据库连接] 正在打开数据库连接...');
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    console.log('[数据库连接] 数据库连接成功');
    
    console.log('[表结构创建] 开始创建数据库表结构...');
    // 创建表结构
    await createTables(db);
    console.log('[表结构创建] 表结构创建完成');
    
    console.log('[默认数据] 开始初始化默认数据...');
    // 初始化默认数据
    await initializeDefaultData(db);
    console.log('[默认数据] 默认数据初始化完成');
    
    // 关闭数据库连接
    await db.close();
    console.log('[数据库连接] 数据库连接已关闭');
    
    console.log('[初始化完成] 数据库初始化成功完成！');
    return true;
  } catch (error) {
    console.error(`[初始化错误] 数据库初始化失败:`, error.message);
    console.error(`[初始化错误] 错误类型:`, error.name);
    console.error(`[初始化错误] 错误详情:`, error.stack);
    console.error(`[初始化错误] 错误代码:`, error.code || '未知');
    
    // 尝试获取更详细的错误信息
    if (error.errno) {
      console.error(`[初始化错误] 错误编号:`, error.errno);
    }
    
    // 不要立即退出，让应用继续运行
    console.log('[初始化错误] 数据库初始化失败，但应用将继续启动...');
    return false;
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, createTables };