import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getUserMultipliedPoints } from '@/lib/special-effects';

// 连胜奖励领取API
export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();
    
    // 支持多种参数名以提高兼容性
    const cycle_days = Number(body.days || body.cycle_days);
    const userId = body.user_id || body.userId;
    
    // 解析查询参数
    const url = new URL(request.url);
    const resetRewards = url.searchParams.get('reset_rewards') === 'true';
    
    console.log('接收到的领取奖励请求:', { body, cycle_days, userId, resetRewards });
    
    // 参数验证
    if (!cycle_days || cycle_days <= 0 || !userId) {
      return NextResponse.json({ error: '缺少必要参数或参数值无效' }, { status: 400 });
    }
    
    // 获取数据库连接
    const db = await getDatabase();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 确保必要的表存在
      // 1. 连胜奖励配置表
      await db.run(`
        CREATE TABLE IF NOT EXISTS streak_length_rewards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_days INTEGER NOT NULL UNIQUE,
          reward_type TEXT NOT NULL,
          reward_amount INTEGER,
          product_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES rewards(id)
        );
      `);
      
      // 2. 用户领取记录
      await db.run(`
        CREATE TABLE IF NOT EXISTS user_claimed_rewards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          reward_type TEXT NOT NULL CHECK(reward_type IN ('points', 'item')),
          reward_details TEXT NOT NULL,
          reward_date TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      // 3. 确保积分历史表存在
      await db.run(`
        CREATE TABLE IF NOT EXISTS point_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          point_type TEXT NOT NULL,
          change_amount INTEGER NOT NULL,
          balance_after INTEGER NOT NULL,
          reason TEXT,
          related_id TEXT,
          related_type TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      // 如果需要重置奖励数据或表为空，则初始化
      const rewardCount = await db.get('SELECT COUNT(*) as count FROM streak_length_rewards');
      if (resetRewards || (rewardCount as any).count === 0) {
        // 清空表（如果是重置）
        if (resetRewards) {
          await db.run('DELETE FROM streak_length_rewards');
          console.log('已重置奖励数据');
        }
        
        // 初始化默认奖励配置
        const defaultRewards = [
          [3, 'coins', 100],
          [7, 'energy', 15],
          [8, 'energy', 15],
          [14, 'coins', 300],
          [21, 'diamonds', 15],
          [30, 'coins', 500]
        ];
        
        for (const [days, type, amount] of defaultRewards) {
          await db.run(
            'INSERT OR IGNORE INTO streak_length_rewards (cycle_days, reward_type, reward_amount, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [days, type, amount]
          );
        }
        
        console.log('已初始化连胜奖励配置');
      }
      
      // 1. 验证用户是否存在
      const userExists = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
      if (!userExists) {
        await db.run('ROLLBACK');
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }
      
      // 2. 验证用户是否达到了对应的连胜天数
      const userData = await db.get(
        'SELECT streak_days FROM points WHERE user_id = ?',
        [userId]
      );
      
      const userStreakDays = Number(userData?.streak_days || 0);
      const targetCycleDays = Number(cycle_days);
      
      console.log(`验证连胜天数 - 用户连胜: ${userStreakDays}, 目标天数: ${targetCycleDays}`);
      
      // 检查用户的连胜天数是否达到目标天数
      if (userData && userStreakDays < targetCycleDays) {
        await db.run('ROLLBACK');
        return NextResponse.json({ error: '连胜天数未达到要求' }, { status: 400 });
      }
      
      // 3. 检查用户是否已经领取过该连胜奖励（而不是该日期的任何奖励）
      const today = new Date().toISOString().split('T')[0]; // 只比较日期部分
      
      // 使用新的查询方式，考虑连胜天数和奖励类型来检查是否已领取
      const existingClaim = await db.get(
        `SELECT * FROM user_claimed_rewards 
         WHERE user_id = ? 
         AND reward_date = ? 
         AND reward_details LIKE ?`,
        [userId, today, `%"cycle_days":${cycle_days}%`]
      );
      
      if (existingClaim) {
        await db.run('ROLLBACK');
        return NextResponse.json({ 
          error: '该连胜奖励已领取',
          created_at: existingClaim.created_at,
          message: `您已于${new Date(existingClaim.created_at).toLocaleString()}领取过此连胜奖励`
        }, { status: 400 });
      }
      
      // 4. 获取奖励详情 - 从数据库动态获取
      let reward = await db.get(
        'SELECT * FROM streak_length_rewards WHERE cycle_days = ?',
        [cycle_days]
      );
      
      let actualRewardDays = cycle_days; // 记录实际使用的奖励天数
      
      // 如果直接查询没有找到，尝试查找最接近且小于等于当前天数的奖励
      if (!reward) {
        const alternativeReward = await db.get(
          'SELECT * FROM streak_length_rewards WHERE cycle_days <= ? ORDER BY cycle_days DESC LIMIT 1',
          [cycle_days]
        );
          
        if (!alternativeReward) {
          await db.run('ROLLBACK');
          return NextResponse.json({ error: '奖励不存在' }, { status: 404 });
        }
          
        // 检查用户是否已经领取过这个备选奖励
        const alternativeClaimed = await db.get(
          `SELECT * FROM user_claimed_rewards 
           WHERE user_id = ? 
           AND reward_date = ? 
           AND reward_details LIKE ?`,
          [userId, today, `%"cycle_days":${alternativeReward.cycle_days}%`]
        );
          
        if (alternativeClaimed) {
          await db.run('ROLLBACK');
          return NextResponse.json({ 
            error: '该连胜奖励已领取',
            created_at: alternativeClaimed.created_at,
            message: `您已于${new Date(alternativeClaimed.created_at).toLocaleString()}领取过此连胜奖励`
          }, { status: 400 });
        }
          
        // 使用备选奖励
        reward = alternativeReward;
        actualRewardDays = alternativeReward.cycle_days;
      }
      
      // 奖励类型映射
      const rewardFieldMap: Record<string, string> = {
        'coins': 'coin',
        'diamonds': 'diamond',
        'energy': 'energy'
      };
      
      // 5. 根据奖励类型发放奖励
      if (reward.reward_type === 'coins' || reward.reward_type === 'diamonds' || reward.reward_type === 'energy') {
        // 更新用户积分
        const updateField = reward.reward_type;
        const historyFieldType = rewardFieldMap[reward.reward_type] || reward.reward_type;
        
        // 应用积分倍数效果
        const finalRewardAmount = await getUserMultipliedPoints(
          parseInt(userId),
          historyFieldType as any,
          reward.reward_amount
        );
        
        // 获取当前余额
        const currentBalance = await db.get(
          `SELECT ${updateField} FROM points WHERE user_id = ?`,
          [userId]
        );
        
        // 更新积分
        await db.run(
          `UPDATE points SET ${updateField} = ${updateField} + ? WHERE user_id = ?`,
          [finalRewardAmount, userId]
        );
        
        // 计算更新后的余额
        const newBalance = (currentBalance as any)[updateField] + reward.reward_amount;
        
        // 记录积分变动历史
        await db.run(
          'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            historyFieldType,
            finalRewardAmount,
            newBalance,
            `连胜${actualRewardDays}天奖励`,
            reward.id,
            'streak_reward'
          ]
        );
        
        console.log(`用户${userId}成功领取连胜${actualRewardDays}天奖励: ${reward.reward_amount} ${reward.reward_type}`);
      } 
      else if (reward.reward_type === 'product') {
        // 验证商品ID是否有效
        if (!reward.product_id) {
          throw new Error('商品ID不存在');
        }
        
        // 检查商品是否存在
        const productExists = await db.get(
          'SELECT id, name FROM rewards WHERE id = ?',
          [reward.product_id]
        );
        
        if (!productExists) {
          throw new Error(`商品ID ${reward.product_id} 不存在`);
        }
        
        // 将物品添加到普通背包表(backpack)而不是user_backpack表
        // 这样可以确保与普通商品使用方式一致，包括使用记录
        try {
          // 获取更多商品信息以存储在背包中
          const rewardDetails = await db.get(
            'SELECT id, name, description, icon FROM rewards WHERE id = ?',
            [reward.product_id]
          );
          
          // 添加到普通背包表
          await db.run(
            'INSERT INTO backpack (user_id, reward_id, status, acquired_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [userId, reward.product_id, 'unused']
          );
          console.log(`用户${userId}成功领取连胜${actualRewardDays}天物品奖励: 物品ID ${reward.product_id}, 物品名称: ${(productExists as any).name}, 已添加到普通背包表`);
        } catch (dbError) {
          console.error('添加物品到普通背包失败:', dbError);
          throw new Error('添加物品到背包失败');
        }
      }
      
      // 6. 记录奖励领取记录
      // 准备奖励详情
      const rewardDetails = {
        reward_type: reward.reward_type,
        reward_amount: reward.reward_amount,
        product_id: reward.product_id,
        point_type: rewardFieldMap[reward.reward_type] || reward.reward_type,
        cycle_days: actualRewardDays
      };
      
      await db.run(
        'INSERT INTO user_claimed_rewards (user_id, reward_type, reward_details, reward_date) VALUES (?, ?, ?, ?)',
        [userId, reward.reward_type === 'product' ? 'item' : 'points', JSON.stringify(rewardDetails), today]
      );
      
      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json({ 
        success: true, 
        message: '奖励领取成功',
        data: {
          userId,
          cycle_days: actualRewardDays,
          reward_type: reward.reward_type,
          reward_amount: reward.reward_amount,
          claimed_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('事务内错误:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('领取奖励失败:', error);
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '领取奖励失败';
    return NextResponse.json({ 
      error: '领取奖励失败',
      detailed_error: errorMessage,
      message: `领取奖励失败: ${errorMessage}`
    }, { status: 500 });
  }
}

// 获取所有连胜奖励配置
export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    
    // 确保表存在
    await db.run(`
      CREATE TABLE IF NOT EXISTS streak_length_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_days INTEGER NOT NULL UNIQUE,
        reward_type TEXT NOT NULL,
        reward_amount INTEGER,
        product_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES rewards(id)
      );
    `);
    
    // 获取所有奖励配置
    const rewards = await db.all(
      'SELECT * FROM streak_length_rewards ORDER BY cycle_days ASC'
    );
    
    return NextResponse.json({
      success: true,
      data: rewards
    });
  } catch (error) {
    console.error('获取奖励配置失败:', error);
    return NextResponse.json({ error: '获取奖励配置失败' }, { status: 500 });
  }
}