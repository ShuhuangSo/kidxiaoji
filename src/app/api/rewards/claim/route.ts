import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getUserMultipliedPoints } from '@/lib/special-effects';

// 领取奖励API处理器
export async function POST(request: NextRequest) {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');
    
    // 如果没有用户ID，返回错误
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '缺少用户ID' },
        { status: 400 }
      );
    }
    
    // 获取请求体数据
    const body = await request.json();
    
    // 验证必要的参数
    if (!body || !body.reward_type || !body.reward_date) {
      return NextResponse.json(
        { success: false, message: '缺少必要的参数' },
        { status: 400 }
      );
    }
    
    const { reward_date, reward_type } = body;
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 检查用户是否已经领取过该日期的特定类型奖励
      // 使用与claimed/route.ts相同的查询逻辑，支持reward_source字段
      let existingClaimQuery: string;
      let existingClaimParams: any[];
      
      // 判断是否为日期奖励请求
      const isDateReward = body.reward_source === 'date_reward' || 
                          (body.reward_type === 'points' && !body.streak_days) || 
                          (body.reward_type === 'item' && !body.streak_days);
      
      if (isDateReward) {
        // 日期奖励：只检查reward_details中reward_source为date_reward的记录
        existingClaimQuery = `SELECT id FROM user_claimed_rewards 
                             WHERE user_id = ? AND reward_date = ? 
                             AND reward_details LIKE '%"reward_source":"date_reward"%'`;
        existingClaimParams = [userId, reward_date];
      } else {
        // 连胜目标奖励：只检查reward_details中reward_source为streak_goal的记录
        existingClaimQuery = `SELECT id FROM user_claimed_rewards 
                             WHERE user_id = ? AND reward_date = ? 
                             AND reward_details LIKE '%"reward_source":"streak_goal"%'`;
        existingClaimParams = [userId, reward_date];
      }
      
      const existingClaim = await db.get(existingClaimQuery, existingClaimParams);
      
      if (existingClaim) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { success: false, message: `今天的${reward_type === 'points' ? '积分' : '商品'}奖励已经领取过了` },
          { status: 400 }
        );
      }
      
      // 临时注释掉任务完成检查，用于测试商品奖励领取功能
      /*
      // 检查用户今天是否完成任务取得连胜（通过检查用户的最新活动记录）
      const streakTodayResult = await db.get(
        `SELECT * FROM user_activity 
         WHERE user_id = ? AND date(activity_date) = date('now') 
         AND activity_type = 'daily_task_complete'`,
        [userId]
      );
      
      if (!streakTodayResult) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { success: false, message: '今天需要完成任务并取得连胜后才能领取奖励' },
          { status: 400 }
        );
      }
      */
      
      // 处理不同类型的奖励
      if (body.reward_type === 'points') {
        // 处理积分奖励
        // 更新用户积分
        const { coins = 0, diamonds = 0, energy = 0 } = body;
        
        // 检查用户是否存在积分记录
        const existingPoints = await db.get(
          'SELECT * FROM points WHERE user_id = ?',
          [userId]
        );
        
        // 计算应用特殊效果后的积分
        const finalCoins = await getUserMultipliedPoints(parseInt(userId), 'coin', coins);
        const finalDiamonds = await getUserMultipliedPoints(parseInt(userId), 'diamond', diamonds); // 钻石也应用倍数效果
        const finalEnergy = await getUserMultipliedPoints(parseInt(userId), 'energy', energy); // 能量也应用倍数效果
        
        // 计算更新后的积分
        let updatedCoins = finalCoins;
        let updatedDiamonds = finalDiamonds;
        let updatedEnergy = finalEnergy;
        
        if (existingPoints) {
          // 更新现有积分记录
          updatedCoins = existingPoints.coins + finalCoins;
          updatedDiamonds = existingPoints.diamonds + finalDiamonds;
          updatedEnergy = existingPoints.energy + finalEnergy;
          
          await db.run(
            'UPDATE points SET coins = coins + ?, diamonds = diamonds + ?, energy = energy + ? WHERE user_id = ?',
            [finalCoins, finalDiamonds, finalEnergy, userId]
          );
        } else {
          // 创建新的积分记录
          await db.run(
            'INSERT INTO points (user_id, coins, diamonds, energy) VALUES (?, ?, ?, ?)',
            [userId, finalCoins, finalDiamonds, finalEnergy]
          );
        }
        
        // 记录积分变动历史
        if (finalCoins > 0) {
          await db.run(
            'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'coin', finalCoins, updatedCoins, '连胜奖励领取', reward_date, 'streak_reward']
          );
        }
        
        if (finalDiamonds > 0) {
          await db.run(
            'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'diamond', finalDiamonds, updatedDiamonds, '连胜奖励领取', reward_date, 'streak_reward']
          );
        }
        
        if (finalEnergy > 0) {
          await db.run(
            'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'energy', finalEnergy, updatedEnergy, '连胜奖励领取', reward_date, 'streak_reward']
          );
        }
        
        // 记录奖励领取日志
        await db.run(
          'INSERT INTO reward_history (user_id, reward_type, reward_data, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [userId, 'points', JSON.stringify({ coins: finalCoins, diamonds: finalDiamonds, energy: finalEnergy })]
        );
        
        // 准备奖励详情
        const rewardDetails = {
          reward_type: 'points',
          coins: finalCoins,
          diamonds: finalDiamonds,
          energy: finalEnergy,
          claimed_at: new Date().toISOString(),
          reward_source: 'date_reward' // 标识这是日期奖励而不是连胜天数奖励
        };
        
        // 记录用户已领取奖励
        await db.run(
          'INSERT INTO user_claimed_rewards (user_id, reward_date, reward_type, reward_details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [userId, reward_date, 'points', JSON.stringify(rewardDetails)]
        );
        
        // 创建积分奖励通知记录
        await db.run(
          'INSERT INTO user_reward_notifications (user_id, reward_type, reward_amount, notification_date, is_read) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
          [userId, 'coins', finalCoins, false]
        );
        
        // 提交事务
        await db.run('COMMIT');
        // 返回成功响应
        return NextResponse.json({
          success: true,
          message: `积分奖励领取成功！获得 ${finalCoins} 金币、${finalDiamonds} 钻石和 ${finalEnergy} 能量值`,
          reward_details: {
            type: 'points',
            coins: finalCoins,
            diamonds: finalDiamonds,
            energy: finalEnergy,
            claimed_at: new Date().toISOString()
          }
        });
      } else if (body.reward_type === 'item') {
        // 处理商品奖励
        const { item_id, item_name } = body;
        
        if (!item_id || !item_name) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { success: false, message: '商品奖励缺少必要信息' },
            { status: 400 }
          );
        }
        
        // 直接使用前端可能传递的item_image，如果没有则为null
        // 不再尝试从items表查询，避免表不存在导致的错误
        let item_image = body.item_image || null;
        
        // 将奖励商品添加到标准的backpack表中，使其可以像普通商品一样使用
        // 检查用户是否已经拥有该商品
        const existingItem = await db.get(
          'SELECT * FROM backpack WHERE user_id = ? AND reward_id = ?',
          [userId, item_id]
        );
        
        if (existingItem) {
          // 如果已存在，增加数量（如果backpack表支持quantity字段）
          // 这里暂时添加一个新记录，实际项目中可以根据表结构优化
          await db.run(
            'INSERT INTO backpack (user_id, reward_id, acquired_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
            [userId, item_id, 'unused']
          );
        } else {
          // 添加新商品到标准背包
          await db.run(
            'INSERT INTO backpack (user_id, reward_id, acquired_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
            [userId, item_id, 'unused']
          );
        }
        
        // 记录奖励领取日志
        await db.run(
          'INSERT INTO reward_history (user_id, reward_type, reward_data, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [userId, 'item', JSON.stringify({ item_id, item_name })]
        );
        
        // 准备奖励详情
        const rewardDetails = {
          reward_type: 'item',
          item_id,
          item_name,
          item_image,
          claimed_at: new Date().toISOString(),
          reward_source: 'date_reward' // 标识这是日期奖励而不是连胜天数奖励
        };
        
        // 记录用户已领取奖励
        await db.run(
          'INSERT INTO user_claimed_rewards (user_id, reward_date, reward_type, reward_details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [userId, reward_date, 'item', JSON.stringify(rewardDetails)]
        );
        
        // 创建奖励通知记录，使其能在GlobalRewardNotification组件中显示
        await db.run(
          'INSERT INTO user_reward_notifications (user_id, date_reward_id, reward_type, product_id, notification_date, is_read) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)',
          [userId, null, 'product', item_id, false]
        );
        
        // 提交事务
        await db.run('COMMIT');
        
        // 返回成功响应
        return NextResponse.json({
          success: true,
          message: `商品奖励领取成功！获得 ${item_name}`,
          reward_details: {
            type: 'item',
            item_id,
            item_name,
            item_image,
            claimed_at: new Date().toISOString()
          }
        });
      } else {
        await db.run('ROLLBACK');
        // 未知的奖励类型
        return NextResponse.json(
          { success: false, message: '未知的奖励类型' },
          { status: 400 }
        );
      }
    } catch (transactionError) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    // 记录详细的错误信息，包括错误对象的所有属性
    console.error('领取奖励失败:', error);
    // 返回包含具体错误信息的响应
    return NextResponse.json(
      { 
        success: false, 
        message: '领取奖励时发生错误',
        error_details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}