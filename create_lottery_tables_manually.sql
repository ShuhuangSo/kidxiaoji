-- 创建抽奖相关的数据库表

-- 1. 创建抽奖配置表
CREATE TABLE IF NOT EXISTS lottery_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cost_type TEXT NOT NULL CHECK(cost_type IN ('coin', 'diamond', 'energy')),
  cost_amount INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建抽奖奖品表
CREATE TABLE IF NOT EXISTS lottery_prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎁',
  probability REAL NOT NULL DEFAULT 1.0,
  prize_type TEXT NOT NULL CHECK(prize_type IN ('product', 'points')),
  product_id INTEGER,
  points_amount INTEGER,
  points_type TEXT CHECK(points_type IN ('coin', 'diamond', 'energy')),
  quantity INTEGER DEFAULT NULL, -- NULL表示无限数量
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lottery_id) REFERENCES lottery_configs(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES rewards(id)
);

-- 3. 创建用户抽奖记录表
CREATE TABLE IF NOT EXISTS user_lottery_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lottery_id INTEGER NOT NULL,
  prize_id INTEGER,
  result JSON NOT NULL,
  draw_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lottery_id) REFERENCES lottery_configs(id),
  FOREIGN KEY (prize_id) REFERENCES lottery_prizes(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lottery_prizes_lottery ON lottery_prizes(lottery_id);
CREATE INDEX IF NOT EXISTS idx_user_lottery_user ON user_lottery_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lottery_lottery ON user_lottery_records(lottery_id);

-- 添加一个默认抽奖配置
INSERT INTO lottery_configs (name, description, cost_type, cost_amount, is_active)
VALUES ('幸运老虎机', '试试你的运气，有机会获得丰厚奖励！', 'diamond', 15, true);

-- 获取刚插入的抽奖ID并添加默认奖品
WITH new_lottery AS (SELECT last_insert_rowid() as id)
INSERT INTO lottery_prizes 
(lottery_id, name, description, icon, probability, prize_type, product_id, points_amount, points_type)
VALUES 
((SELECT id FROM new_lottery), '100金币', '获得100金币', '💰', 50, 'points', NULL, 100, 'coin'),
((SELECT id FROM new_lottery), '50钻石', '获得50钻石', '💎', 20, 'points', NULL, 50, 'diamond'),
((SELECT id FROM new_lottery), '200金币', '获得200金币', '💰', 15, 'points', NULL, 200, 'coin'),
((SELECT id FROM new_lottery), '100钻石', '获得100钻石', '💎', 5, 'points', NULL, 100, 'diamond'),
((SELECT id FROM new_lottery), '神秘盲盒', '获得神秘盲盒', '🎁', 8, 'product', 4, NULL, NULL),
((SELECT id FROM new_lottery), '幸运大奖', '恭喜获得幸运大奖！', '🎉', 2, 'points', NULL, 500, 'coin');

SELECT '抽奖表创建成功！' as message;