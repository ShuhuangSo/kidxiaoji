import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { recordSpecialEffect } from '@/lib/special-effects';
import { getMultiplierEffectDurationHours, getMultiplierEffectDuration } from '@/lib/system-settings';

// 打开数据库连接
async function getDatabase() {
  const dbPath = process.env.DATABASE_PATH || '/app/db/database.db';
  console.log(`backpack/use数据库路径: ${dbPath}`);
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// 确保表和字段存在
  async function ensureSpecialProductSupport(db: any) {
    // 检查并添加rewards表的特殊商品字段
    const tableInfo = await db.all('PRAGMA table_info(rewards)');
    const columnNames = tableInfo.map((col: any) => col.name);
    
    if (!columnNames.includes('is_special_product')) {
      await db.run('ALTER TABLE rewards ADD COLUMN is_special_product BOOLEAN DEFAULT false');
    }
    
    if (!columnNames.includes('reward_point_type')) {
      await db.run('ALTER TABLE rewards ADD COLUMN reward_point_type TEXT CHECK(reward_point_type IN ("coin", "diamond", "energy"))');
    }
    
    if (!columnNames.includes('reward_multiplier')) {
      await db.run('ALTER TABLE rewards ADD COLUMN reward_multiplier REAL DEFAULT 1.0');
    }
    
    if (!columnNames.includes('effect_duration_hours')) {
      await db.run('ALTER TABLE rewards ADD COLUMN effect_duration_hours INTEGER DEFAULT 6');
    }
    
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
    
    // 添加索引以提高查询性能
    await db.run('CREATE INDEX IF NOT EXISTS idx_special_effects_user_id ON special_effects(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_special_effects_end_time ON special_effects(end_time)');
    
    // 创建user_permissions表（如果不存在）- 用于存储用户权限，如改名权限
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        permission_type TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // 添加索引以提高查询性能
    await db.run('CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(user_id, permission_type, is_active)');
  }

// 使用背包物品
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const body = await request.json();
    const { itemId } = body;
    
    console.log('使用背包物品，用户ID:', userId, '物品ID:', itemId);
    
    if (!userId || !itemId) {
      return NextResponse.json(
        { message: '用户ID和物品ID不能为空' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 确保表和字段存在
    await ensureSpecialProductSupport(db);
    
    // 首先检查是否是传统backpack表中的物品
    let item = await db.get(
      `SELECT b.id, b.reward_id, r.* FROM backpack b
       JOIN rewards r ON b.reward_id = r.id
       WHERE b.id = ? AND b.user_id = ? AND b.status = 'unused'`,
      [itemId, userId]
    );
    let isTraditionalBackpack = true;
    
    // 如果传统backpack表中没有找到，检查user_backpack表（连胜奖励）
    if (!item) {
      const userBackpackItem = await db.get(
        `SELECT * FROM user_backpack WHERE id = ? AND user_id = ? AND quantity > 0`,
        [itemId, userId]
      );
      
      if (userBackpackItem) {
        // 获取对应的奖励信息
        const rewardInfo = await db.get(
          `SELECT * FROM rewards WHERE id = ?`,
          [userBackpackItem.item_id]
        );
        
        if (rewardInfo) {
          item = { ...userBackpackItem, ...rewardInfo };
        }
        
        isTraditionalBackpack = false;
      }
    }

    if (!item) {
      return NextResponse.json(
        { message: '物品不存在或无权使用' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let isSpecialProductUsed = false;
    let specialProductInfo = null;
    
    // 处理特殊商品逻辑
    if (item.is_special_product && item.reward_point_type && item.reward_multiplier > 1) {
      // 记录特殊效果
      try {
        // 从系统设置获取积分翻倍效果持续时间（包含小时和分钟）
        const durationInfo = await getMultiplierEffectDuration();
        const effectDurationHours = durationInfo.hours + (durationInfo.minutes / 60); // 用于计算结束时间的总小时数
        
        await recordSpecialEffect(
          Number(userId),
          'reward_multiplier',
          item.reward_point_type,
          item.reward_multiplier,
          effectDurationHours,
          `使用特殊商品: ${item.name}`
        );
        
        isSpecialProductUsed = true;
        specialProductInfo = {
          pointType: item.reward_point_type,
          multiplier: item.reward_multiplier,
          durationHours: durationInfo.hours,
          durationMinutes: durationInfo.minutes
        };
        
        console.log('特殊商品使用成功，已记录效果');
      } catch (error) {
        console.error('记录特殊效果失败:', error);
        isSpecialProductUsed = false;
      }
    }
    
    // 处理改名卡逻辑
    if (item.name && item.name.includes('改名卡')) {
      try {
        // 为用户添加用户名修改权限
        await db.run(
          `INSERT INTO user_permissions (user_id, permission_type, is_active, created_at)
           VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
          [Number(userId), 'username_change']
        );
        
        isSpecialProductUsed = true;
        specialProductInfo = {
          permissionType: 'username_change',
          description: '获得一次修改用户名的权限'
        };
        
        console.log('改名卡使用成功，已为用户添加修改用户名权限');
      } catch (error) {
        console.error('添加用户名修改权限失败:', error);
        isSpecialProductUsed = false;
      }
    }
    
    // 处理改头像卡逻辑
    if (item.name && item.name.includes('改头像卡')) {
      try {
        // 为用户添加头像修改权限
        await db.run(
          `INSERT INTO user_permissions (user_id, permission_type, is_active, created_at)
           VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
          [Number(userId), 'avatar_change']
        );
        
        isSpecialProductUsed = true;
        specialProductInfo = {
          permissionType: 'avatar_change',
          description: '获得一次修改头像的权限'
        };
        
        console.log('改头像卡使用成功，已为用户添加修改头像权限');
      } catch (error) {
        console.error('添加头像修改权限失败:', error);
        isSpecialProductUsed = false;
      }
    }
    
    // 处理盲盒逻辑 - 根据is_lucky_box字段而不是名称
    if (item.is_lucky_box) {
      try {
        // 获取盲盒奖品列表
        const boxItems = await db.all(
          'SELECT * FROM lucky_box_items WHERE lucky_box_id = ?',
          [item.reward_id || item.id]
        );
        
        if (boxItems.length === 0) {
          throw new Error('盲盒暂未配置奖品');
        }
        
        // 根据概率抽取奖品
        const drawReward = (items: any[]) => {
          const totalProbability = items.reduce((sum, item) => sum + item.probability, 0);
          const random = Math.random() * totalProbability;
          
          let cumulativeProbability = 0;
          for (const item of items) {
            cumulativeProbability += item.probability;
            if (random <= cumulativeProbability) {
              return item;
            }
          }
          return items[0];
        };
        
        // 抽取奖品
        const drawnItem = drawReward(boxItems);
        const drawResult: any = {
          drawn_item: drawnItem,
          lucky_box_name: item.name
        };
        
        // 处理抽到的奖品
        if (drawnItem.item_type === 'points') {
          // 解析积分类型和数量
          let pointType = 'coin';
          let amount = drawnItem.item_value;
          
          if (drawnItem.item_detail) {
            const detail = JSON.parse(drawnItem.item_detail);
            pointType = detail.point_type || 'coin';
          }
          
          // 增加用户积分
          // 确保使用正确的列名（复数形式）
          const correctColumn = pointType === 'coin' ? 'coins' : 
                             pointType === 'diamond' ? 'diamonds' : 
                             pointType === 'energy' ? 'energy' : pointType;
          await db.run(
            `UPDATE points SET ${correctColumn} = ${correctColumn} + ? WHERE user_id = ?`,
            [amount, userId]
          );
          
          // 获取更新后的积分
          const finalPoints = await db.get(
            'SELECT coins, diamonds, energy FROM points WHERE user_id = ?',
            [userId]
          );
          
          // 记录积分变动历史
          await db.run(
            'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, pointType, amount, (finalPoints as any)[correctColumn], `盲盒中奖`, item.id, 'lucky_box_reward']
          );
          
          drawResult.reward_type = 'points';
          drawResult.reward_point_type = pointType;
          drawResult.reward_amount = amount;
          drawResult.final_balance = finalPoints;
          drawResult.message = `恭喜抽到${amount}${pointType === 'coin' ? '金币' : pointType === 'diamond' ? '钻石' : '能量值'}`;
          
        } else if (drawnItem.item_type === 'product') {
          // 将商品添加到用户背包
          await db.run(
            'INSERT INTO backpack (user_id, reward_id, acquired_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
            [userId, drawnItem.item_value, 'unused']
          );
          
          // 获取商品信息
          const product = await db.get(
            'SELECT name, description, icon FROM rewards WHERE id = ?',
            [drawnItem.item_value]
          );
          
          drawResult.reward_type = 'product';
          drawResult.product = product;
          drawResult.product_id = drawnItem.item_value;
          drawResult.message = `恭喜抽到商品：${product?.name}`;
        }
        
        isSpecialProductUsed = true;
        specialProductInfo = drawResult;
        console.log('神秘盲盒使用成功，抽奖结果:', drawResult);
      } catch (error) {
        console.error('使用神秘盲盒失败:', error);
        throw new Error(error instanceof Error ? error.message : '使用神秘盲盒失败');
      }
    }
    
    if (isTraditionalBackpack) {
      // 更新传统backpack表中的物品状态
      await db.run(
        `UPDATE backpack SET status = 'used', use_time = ? WHERE id = ?`,
        [now, itemId]
      );
    } else {
      // 对于user_backpack表中的连胜奖励物品，减少数量
      await db.run(
        `UPDATE user_backpack SET quantity = quantity - 1 WHERE id = ?`,
        [itemId]
      );
      
      // 如果数量变为0，可以选择删除该记录
      await db.run(
        `DELETE FROM user_backpack WHERE id = ? AND quantity = 0`,
        [itemId]
      );
    }

    console.log('物品使用成功，记录使用时间:', now);

    // 返回响应，包含特殊商品信息（如果适用）
    const response: any = {
      message: '物品使用成功',
      is_special_product: isSpecialProductUsed
    };
    
    if (isSpecialProductUsed && specialProductInfo) {
      if (specialProductInfo.permissionType) {
        response.permission_type = specialProductInfo.permissionType;
        response.description = specialProductInfo.description;
        // 根据不同的权限类型返回不同的提示消息
        if (specialProductInfo.permissionType === 'username_change') {
          response.message = '改名卡使用成功！您现在可以修改用户名一次。';
        } else if (specialProductInfo.permissionType === 'avatar_change') {
          response.message = '改头像卡使用成功！您现在可以修改头像一次。';
        }
      } else if (specialProductInfo.effect_type === 'reward_multiplier') {
        // 其他特殊商品（如奖励倍数）
        response.effect_type = 'reward_multiplier';
        response.multiplier = specialProductInfo.multiplier;
        response.point_type = specialProductInfo.pointType;
        response.duration_hours = Number(specialProductInfo.durationHours);
        response.duration_minutes = Number(specialProductInfo.durationMinutes);
      } else if (specialProductInfo.drawn_item) {
        // 神秘盲盒抽奖结果
        response.drawn_item = specialProductInfo.drawn_item;
        response.reward_type = specialProductInfo.reward_type;
        response.reward_point_type = specialProductInfo.reward_point_type;
        response.reward_amount = specialProductInfo.reward_amount;
        response.final_balance = specialProductInfo.final_balance;
        response.product = specialProductInfo.product;
        response.product_id = specialProductInfo.product_id;
        response.message = specialProductInfo.message || '抽奖成功！';
      }
    }

    // 关闭数据库连接
    await db.close();

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('使用背包物品失败:', error);
    return NextResponse.json(
      { message: '使用背包物品失败' },
      { status: 500 }
    );
  }
}