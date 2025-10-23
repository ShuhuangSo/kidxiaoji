import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getMultiplierEffectDurationHours, getMultiplierEffectDuration } from '@/lib/system-settings';
import { getMinEnergyByLevel } from '@/lib/levelUtils';

// 兑换奖励API
export async function POST(request: Request) {
  try {
    const { userId, rewardId } = await request.json();
    console.log('Received redemption request:', { userId, rewardId });
    
    // 验证必要参数
    if (!userId || !rewardId) {
      console.warn('Missing required parameters:', { userId, rewardId });
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    console.log('Database connection established');
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    console.log('Transaction started for user', userId, 'redeeming reward', rewardId);
    
    try {
      // 获取奖励信息
      const reward = await db.get(
        'SELECT * FROM rewards WHERE id = ? AND is_active = true',
        [rewardId]
      );
      console.log('Reward info retrieved:', { rewardId, exists: !!reward });
      
      if (!reward) {
        await db.run('ROLLBACK');
        console.warn('Reward not found or inactive:', rewardId);
        return NextResponse.json(
          { message: '奖励不存在或已下架' },
          { status: 404 }
        );
      }
      
      // 获取用户积分信息（包含等级）
      let points = await db.get(
        'SELECT coins, diamonds, energy, level FROM points WHERE user_id = ?',
        [userId]
      );
      console.log('User points info retrieved:', { userId, pointsExists: !!points });
      
      if (!points) {
        // 如果用户积分记录不存在，创建新记录
        await db.run(
          'INSERT INTO points (user_id, coins, diamonds, energy) VALUES (?, 0, 0, 0)',
          [userId]
        );
        console.log('Created new points record for user:', userId);
        points = { coins: 0, diamonds: 0, energy: 0 };
      }
      
      // 标准化积分类型
      const normalizedCostType = reward.cost_type.toLowerCase().replace(/s$/, '');
      console.log('Normalized cost type:', { original: reward.cost_type, normalized: normalizedCostType });
      
      // 检查用户等级是否满足要求
      if (reward.min_level && reward.min_level > 0) {
        const requiredMinEnergy = getMinEnergyByLevel(reward.min_level);
        const userEnergy = points?.energy || 0;
        
        if (userEnergy < requiredMinEnergy) {
          await db.run('ROLLBACK');
          console.warn(`User energy too low: user ${userId} energy ${userEnergy}, required ${requiredMinEnergy}`);
          
          // 获取等级名称
          let requiredLevelName = '鸡蛋';
          switch(reward.min_level) {
            case 1: requiredLevelName = '鸡蛋'; break;
            case 2: requiredLevelName = '鸡宝宝'; break;
            case 3: requiredLevelName = '青铜鸡'; break;
            case 4: requiredLevelName = '铁公鸡'; break;
            case 5: requiredLevelName = '钻石鸡'; break;
            case 6: requiredLevelName = '白金鸡'; break;
            case 7: requiredLevelName = '王者鸡'; break;
            case 8: requiredLevelName = '霸道鸡'; break;
          }
          
          return NextResponse.json(
            { message: `等级不足，需要达到${requiredLevelName}等级才能兑换此商品` },
            { status: 400 }
          );
        }
      }
      
      // 检查用户积分是否足够
      let currentBalance = 0;
      let dbPointType = '';
      
      switch (normalizedCostType) {
        case 'coin':
          dbPointType = 'coins';
          currentBalance = points.coins || 0;
          break;
        case 'diamond':
          dbPointType = 'diamonds';
          currentBalance = points.diamonds || 0;
          break;
        case 'energy':
          dbPointType = 'energy';
          currentBalance = points.energy || 0;
          break;
        default:
          await db.run('ROLLBACK');
          console.warn('Invalid point type:', normalizedCostType);
          return NextResponse.json(
            { message: '无效的积分类型' },
            { status: 400 }
          );
      }
      
      console.log(`Balance check: ${dbPointType} - current: ${currentBalance}, required: ${reward.cost_amount}`);
      
      if (currentBalance < reward.cost_amount) {
        await db.run('ROLLBACK');
        console.warn(`Insufficient points: user ${userId} has ${currentBalance} ${dbPointType}, needs ${reward.cost_amount}`);
        return NextResponse.json(
          { 
            message: `积分不足，当前${dbPointType === 'coins' ? '金币' : dbPointType === 'diamonds' ? '钻石' : '能量'}: ${currentBalance}，需要: ${reward.cost_amount}` 
          },
          { status: 400 }
        );
      }
      
      // 扣除积分
      console.log(`Deducting ${reward.cost_amount} ${dbPointType} from user ${userId}`);
      await db.run(
        `UPDATE points SET ${dbPointType} = ${dbPointType} - ? WHERE user_id = ?`,
        [reward.cost_amount, userId]
      );
      
      // 获取更新后的余额
      const updatedPoints = await db.get(
        `SELECT ${dbPointType} FROM points WHERE user_id = ?`,
        [userId]
      );
      console.log(`Updated balance for ${userId}: ${updatedPoints[dbPointType]} ${dbPointType}`);
      
      // 记录兑换历史
      // 使用标准化类型名称，确保符合数据库约束
      const historyPointType = normalizedCostType; // 已经是'coin'/'diamond'/'energy'格式
      console.log('Recording point history');
      try {
        await db.run(
          'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            historyPointType,
            -reward.cost_amount, // 负数表示扣除
            updatedPoints[dbPointType],
            `兑换奖励: ${reward.name}`,
            rewardId,
            'reward'
          ]
        );
        console.log('Point history recorded successfully');
      } catch (historyError) {
        console.error('Error recording point history:', historyError);
        throw new Error(`Point history error: ${(historyError as Error).message}`);
      }
      
      // 记录兑换记录
        console.log('Recording redemption');
        try {
          await db.run(
            'INSERT INTO redemptions (user_id, reward_id, redeemed_at, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
            [userId, rewardId, 'approved']
          );
          console.log('Redemption recorded successfully');
        } catch (redemptionError) {
          console.error('Error recording redemption:', redemptionError);
          throw new Error(`Redemption error: ${(redemptionError as Error).message}`);
        }
      
      // 将物品添加到用户背包
      console.log('Adding item to backpack');
      try {
        // 获取积分翻倍效果的持续时间
          const effectDurationHours = await getMultiplierEffectDurationHours();
          await db.run(
            'INSERT INTO backpack (user_id, reward_id, acquired_time, status, effect_duration_hours) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)',
            [userId, rewardId, 'unused', effectDurationHours]
          );
        console.log('Item added to backpack successfully');
      } catch (backpackError) {
        console.error('Error adding to backpack:', backpackError);
        throw new Error(`Backpack error: ${(backpackError as Error).message}`);
      }
      
      // 初始化durationInfo变量，提升作用域以便在响应构建时访问
      let durationInfo = { hours: 6, minutes: 0 }; // 默认值
      
      // 处理特殊商品逻辑
      if (reward.is_special_product && reward.reward_point_type && reward.reward_multiplier > 1) {
        // 记录特殊商品效果
        console.log('Handling special product effect');
        try {
          // 获取积分翻倍效果的持续时间（包含小时和分钟）
          durationInfo = await getMultiplierEffectDuration();
          const effectDurationHours = durationInfo.hours + (durationInfo.minutes / 60); // 用于计算结束时间的总小时数
          const effectEndTime = new Date();
          // 将总小时数转换为毫秒，然后设置时间
          // 这样可以正确处理包含小数部分的小时数（如2.5小时 = 2小时30分钟）
          effectEndTime.setTime(effectEndTime.getTime() + effectDurationHours * 60 * 60 * 1000);
          
          await db.run(
            'INSERT INTO special_effects (user_id, effect_type, point_type, multiplier, start_time, end_time, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'reward_multiplier', reward.reward_point_type, reward.reward_multiplier, new Date().toISOString(), effectEndTime.toISOString(), `兑换特殊商品: ${reward.name}`]
          );
          console.log('Special product effect recorded successfully');
        } catch (effectError) {
          console.error('Error recording special product effect:', effectError);
          throw new Error(`Special product effect error: ${(effectError as Error).message}`);
        }
      }
      
      // 提交事务
      await db.run('COMMIT');
      console.log('Transaction committed successfully for user', userId);
      
      // 返回响应，包含特殊商品信息（如果适用）
      const response: {
        message: string;
        reward: any;
        newBalance: any;
        is_special_product?: boolean;
        reward_multiplier?: number;
        reward_point_type?: string;
        effect_duration_hours?: number;
        effect_duration_minutes?: number;
      } = {
        message: '兑换成功',
        reward: reward,
        newBalance: updatedPoints[dbPointType]
      };
      
      // 如果是特殊商品，添加额外信息
      if (reward.is_special_product) {
        // 重用之前已获取的durationInfo
        response.is_special_product = true;
        response.reward_multiplier = reward.reward_multiplier;
        response.reward_point_type = reward.reward_point_type;
        response.effect_duration_hours = durationInfo.hours;
        response.effect_duration_minutes = durationInfo.minutes;
      }
      
      return NextResponse.json(response);
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      console.error('Transaction error during redemption:', error);
      throw error;
    }
  } catch (error) {
    console.error('兑换奖励错误:', error);
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        message: '服务器错误',
        errorDetails: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 获取用户兑换历史
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: '缺少用户ID参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 获取用户兑换历史，包含奖励的cost_type和cost_amount字段
    const history = await db.all(
      `SELECT re.id, re.name as reward_name, re.description, re.icon, 
              r.redeemed_at as redemption_time, r.status, 
              re.cost_type, re.cost_amount
       FROM redemptions r 
       JOIN rewards re ON r.reward_id = re.id 
       WHERE r.user_id = ? 
       ORDER BY r.redeemed_at DESC`,
      [userId]
    );
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('获取兑换历史错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}