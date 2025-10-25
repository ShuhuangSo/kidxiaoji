import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

// 类型定义
export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'child' | 'parent';
  created_at: Date;
  avatar?: string; // 头像URL或文件路径
}
// 类型定义
export interface Points {
  user_id: number;
  coins: number;
  diamonds: number;
  energy: number;
  level: number;
  streak_days: number;
  last_streak_date: Date; // 最后一次连胜日期
  consecutive_missed_days: number; // 连续冻结日数
  updated_at: Date;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  reward_type: 'coin' | 'diamond';
  reward_amount: number;
  is_daily: boolean;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  expiry_time: Date | null;
  target_user_id: number | null;
  created_at: Date;
}

export interface UserTask {
  id: number;
  user_id: number;
  task_id: number;
  status: 'pending' | 'completed' | 'missed';
  completed_at: Date | null;
  assigned_date: Date;
  needs_approval: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  cost_type: 'coin' | 'diamond';
  cost_amount: number;
  icon: string;
  is_active: boolean;
  created_at: Date;
  is_special_product?: boolean;
  reward_multiplier?: number;
  reward_point_type?: string;
  is_hidden?: boolean;
  min_level?: number;
}

export interface Redemption {
  id: number;
  user_id: number;
  reward_id: number;
  redeemed_at: Date;
  status: 'pending' | 'approved' | 'rejected';
}

// 数据库文件路径 - 使用绝对路径避免Docker环境中的相对路径问题
const DB_PATH = process.env.NODE_ENV === 'production' ? '/app/database_data/database.db' : './database.db';
const INIT_SQL_PATH = process.env.DATABASE_INIT_SCRIPT || join(__dirname, '../../db/init-database.sql');

// 初始化数据库连接和表结构
export async function initDatabase() {
  console.log(`尝试连接数据库文件: ${DB_PATH}`);
  
  // 在生产环境中添加权限检查日志
  if (process.env.NODE_ENV === 'production') {
    try {
      const fs = require('fs');
      const stat = fs.statSync(DB_PATH);
      console.log(`数据库文件状态: size=${stat.size}, mode=${stat.mode.toString(8)}`);
    } catch (err: unknown) {
      console.warn(`无法获取数据库文件状态: ${(err as Error).message}`);
    }
  }
  
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  try {
    // 尝试使用SQL脚本初始化数据库
    console.log(`尝试从脚本初始化数据库: ${INIT_SQL_PATH}`);
    
    // 检查SQL脚本文件是否存在
    try {
        const sqlScript = readFileSync(INIT_SQL_PATH, 'utf8');
        // 执行SQL脚本
        await db.exec(sqlScript);
        console.log('数据库脚本执行成功');
      } catch (sqlError) {
        console.warn('SQL脚本执行失败或不存在，使用备用初始化方法:', (sqlError as Error).message);
        // 如果脚本执行失败，使用原来的方法初始化
        await createTables(db);
        await initializeData(db);
        await initializeSystemSettings(db);
      }
  } catch (error) {
      console.error('数据库初始化失败:', (error as Error).message);
      throw error;
    }
  
  return db;
}

// 创建数据库表结构
async function createTables(database?: any) {
  if (!database) {
    database = await initDatabase();
  }
  
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
}

// 初始化默认数据
async function initializeData(database?: any) {
  if (!database) {
    database = await initDatabase();
  }
  
  // 检查是否已有用户数据
  const usersCount = await database.get('SELECT COUNT(*) as count FROM users');
  
  if ((usersCount as any).count === 0) {
    // 创建默认用户 (注意：实际应用中应使用安全的密码哈希)
    const adminId = await database.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['admin', 'admin123', 'parent'] // 简化示例，实际应用中应使用 bcrypt 等哈希算法
    );
    
    const childId = await database.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['xiaoming', '123456', 'child'] // 简化示例，实际应用中应使用 bcrypt 等哈希算法
    );
    
    // 添加新的测试用户
    const testChildId = await database.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['testuser', 'test123', 'child'] // 新测试账号
    );
    
    // 初始化积分数据
    const today = new Date().toISOString();
    await database.run(
      'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [(childId as any).lastID, 1000, 50, 0, 5, 3, today, 0]
    );
    
    // 为新测试用户初始化积分数据
    await database.run(
      'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [(testChildId as any).lastID, 800, 30, 0, 3, 1, today, 0]
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
    
    for (const task of taskRows as any[]) {
      await database.run(
        'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
        [(childId as any).lastID, task.id, 'pending', todayDate]
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
}

// 获取数据库实例
// 初始化系统设置
async function initializeSystemSettings(database?: any) {
  if (!database) {
    database = await initDatabase();
  }
  
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
  
  // 检查是否已有系统设置数据
  const settingsCount = await database.get('SELECT COUNT(*) as count FROM system_settings');
  
  if ((settingsCount as any).count === 0) {
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

// 获取数据库实例 - 每次返回新的连接
export async function getDatabase() {
  console.log(`尝试连接数据库文件: ${DB_PATH}`);
  
  // 在生产环境中添加权限检查日志
  if (process.env.NODE_ENV === 'production') {
    try {
      const fs = require('fs');
      // 检查目录是否存在且可访问
      const dbDir = DB_PATH.substring(0, DB_PATH.lastIndexOf('/'));
      if (!fs.existsSync(dbDir)) {
        console.warn(`数据库目录不存在，尝试创建: ${dbDir}`);
        try {
          fs.mkdirSync(dbDir, { recursive: true });
          console.log(`数据库目录创建成功: ${dbDir}`);
        } catch (mkdirError) {
          console.error(`创建数据库目录失败: ${(mkdirError as Error).message}`);
        }
      }
      
      // 检查文件是否存在并尝试创建
      if (!fs.existsSync(DB_PATH)) {
        console.warn(`数据库文件不存在，将尝试创建: ${DB_PATH}`);
        try {
          // 创建空文件
          fs.writeFileSync(DB_PATH, '');
          console.log(`数据库文件创建成功: ${DB_PATH}`);
        } catch (touchError) {
          console.error(`创建数据库文件失败: ${(touchError as Error).message}`);
        }
      }
      
      const stat = fs.statSync(DB_PATH);
      console.log(`数据库文件状态: size=${stat.size}, mode=${stat.mode.toString(8)}`);
    } catch (err: unknown) {
      console.warn(`数据库文件状态检查失败: ${(err as Error).message}`);
    }
  }
  
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    console.log('数据库连接成功');
    return db;
  } catch (error: unknown) {
    console.error(`数据库连接失败: ${(error as Error).message}`);
    // 如果连接失败，尝试使用内存数据库作为后备选项（仅用于开发环境）
    if (process.env.NODE_ENV !== 'production') {
      console.warn('尝试使用内存数据库作为后备选项');
      const memoryDb = await open({
        filename: ':memory:',
        driver: sqlite3.Database
      });
      // 在内存数据库中创建必要的表
      await createTables(memoryDb);
      return memoryDb;
    }
    throw error; // 在生产环境中重新抛出错误
  }
}