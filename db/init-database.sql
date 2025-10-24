-- 数据库初始化脚本 - 此文件可安全提交到GitHub
-- 包含表结构定义和初始数据

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('child', 'parent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  avatar TEXT
);

-- 创建积分表
CREATE TABLE IF NOT EXISTS points (
  user_id INTEGER PRIMARY KEY,
  coins INTEGER DEFAULT 0,
  diamonds INTEGER DEFAULT 0,
  energy INTEGER DEFAULT 100,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_streak_date TIMESTAMP,
  consecutive_missed_days INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL CHECK(reward_type IN ('coin', 'diamond')),
  reward_amount INTEGER NOT NULL,
  is_daily BOOLEAN DEFAULT FALSE,
  recurrence TEXT DEFAULT 'none' CHECK(recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  expiry_time TIMESTAMP,
  target_user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建用户任务关联表
CREATE TABLE IF NOT EXISTS user_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'missed')),
  completed_at TIMESTAMP,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  needs_approval BOOLEAN DEFAULT FALSE,
  approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(user_id, task_id, assigned_date)
);

-- 创建奖励表
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cost_type TEXT NOT NULL CHECK(cost_type IN ('coin', 'diamond')),
  cost_amount INTEGER NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_special_product BOOLEAN DEFAULT FALSE,
  reward_multiplier REAL,
  reward_point_type TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  min_level INTEGER DEFAULT 1
);

-- 创建兑换记录表
CREATE TABLE IF NOT EXISTS redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
);

-- 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建背包表
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建抽奖相关表
CREATE TABLE IF NOT EXISTS lottery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  probability REAL NOT NULL,
  icon TEXT,
  is_special BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS lottery_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lottery_item_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lottery_item_id) REFERENCES lottery_items(id) ON DELETE CASCADE
);

-- 创建成就表
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  reward_coins INTEGER DEFAULT 0,
  reward_diamonds INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_claimed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_id)
);

-- 插入示例管理员账户（注意：实际部署时应修改默认密码）
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES 
('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'parent'); -- 默认密码: admin123

-- 插入默认系统设置
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('daily_reward_coins', '50', '每日签到奖励金币数'),
('daily_reward_diamonds', '5', '每日签到奖励钻石数'),
('max_energy', '100', '最大能量值'),
('energy_refill_rate', '10', '每小时恢复能量值'),
('streak_bonus_multiplier', '1.5', '连续签到奖励倍数'),
('level_up_multiplier', '1.2', '升级所需经验倍数');

-- 插入示例奖励
INSERT OR IGNORE INTO rewards (name, description, cost_type, cost_amount, icon, is_active) VALUES
('小礼品', '一个精美的小礼品', 'coin', 100, 'gift.png', TRUE),
('大礼品', '一个豪华的大礼品', 'coin', 500, 'big_gift.png', TRUE),
('神秘宝箱', '包含惊喜奖励的宝箱', 'diamond', 10, 'treasure_box.png', TRUE);

-- 插入示例任务
INSERT OR IGNORE INTO tasks (title, description, reward_type, reward_amount, is_daily, recurrence) VALUES
('完成作业', '认真完成今天的家庭作业', 'coin', 30, TRUE, 'daily'),
('帮忙做家务', '帮助父母完成一项家务', 'coin', 20, TRUE, 'daily'),
('阅读书籍', '每天阅读30分钟', 'coin', 25, TRUE, 'daily'),
('锻炼身体', '进行30分钟的体育锻炼', 'coin', 40, TRUE, 'daily'),
('学习新技能', '学习一项新的技能或知识', 'diamond', 5, FALSE, 'weekly');