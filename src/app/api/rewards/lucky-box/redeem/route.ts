import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 根据概率抽取奖品
function drawReward(items: any[]) {
  // 计算总概率
  const totalProbability = items.reduce((sum, item) => sum + item.probability, 0);
  
  // 生成随机数
  const random = Math.random() * totalProbability;
  
  // 根据概率抽取奖品
  let cumulativeProbability = 0;
  for (const item of items) {
    cumulativeProbability += item.probability;
    if (random <= cumulativeProbability) {
      return item;
    }
  }
  
  // 以防万一，返回第一个奖品
  return items[0];
}

// 兑换盲盒并抽取奖品
export async function POST(request: NextRequest) {
  try {
    const { userId, rewardId } = await request.json();
    console.log('Received lucky box redemption request:', { userId, rewardId });
    
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
    console.log('Transaction started for user', userId, 'redeeming lucky box', rewardId);
    
    try {
      // 获取盲盒信息
      const luckyBox = await db.get(
        'SELECT * FROM rewards WHERE id = ? AND is_lucky_box = true AND is_active = true',
        [rewardId]
      );
      console.log('Lucky box info retrieved:', { rewardId, exists: !!luckyBox });
      
      if (!luckyBox) {
        await db.run('ROLLBACK');
        console.warn('Lucky box not found or inactive:', rewardId);
        return NextResponse.json(
          { message: '盲盒不存在或已下架' },
          { status: 404 }
        );
      }
      
      // 获取用户积分信息
      let points = await db.get(
        'SELECT coins, diamonds, energy FROM points WHERE user_id = ?',
        [userId]
      );
      console.log('User points info retrieved:', { userId, pointsExists: !!points });
      
      if (!points) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '用户积分信息不存在' },
          { status: 404 }
        );
      }
      
      // 检查用户积分是否足够
      const costType = (luckyBox as any).cost_type;
      const costAmount = (luckyBox as any).cost_amount;
      let currentBalance = 0;
      let dbPointType = '';
      
      if (costType === 'coin' || costType === 'coins') {
        currentBalance = (points as any).coins;
        dbPointType = 'coin';
      } else if (costType === 'diamond' || costType === 'diamonds') {
        currentBalance = (points as any).diamonds;
        dbPointType = 'diamond';
      } else if (costType === 'energy') {
        currentBalance = (points as any).energy;
        dbPointType = 'energy';
      }
      
      if (currentBalance < costAmount) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '积分不足' },
          { status: 400 }
        );
      }
      
      // 扣除积分
      const updatedPoints = { ...points };
      if (dbPointType === 'coin') {
        updatedPoints.coins -= costAmount;
      } else if (dbPointType === 'diamond') {
        updatedPoints.diamonds -= costAmount;
      } else if (dbPointType === 'energy') {
        updatedPoints.energy -= costAmount;
      }
      
      await db.run(
        `UPDATE points SET ${dbPointType} = ? WHERE user_id = ?`,
        [updatedPoints[dbPointType], userId]
      );
      console.log('Points deducted:', { userId, dbPointType, costAmount });
      
      // 记录积分变动历史
      await db.run(
        'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, dbPointType, -costAmount, updatedPoints[dbPointType], `兑换盲盒: ${(luckyBox as any).name}`, rewardId, 'lucky_box']
      );
      
      // 获取盲盒奖品列表
      const boxItems = await db.all(
        'SELECT * FROM lucky_box_items WHERE lucky_box_id = ?',
        [rewardId]
      );
      
      if (boxItems.length === 0) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '盲盒暂未配置奖品' },
          { status: 400 }
        );
      }
      
      // 抽取奖品
      const drawnItem = drawReward(boxItems);
      const result: any = {
        message: '兑换成功',
        drawn_item: drawnItem,
        new_balance: updatedPoints[dbPointType],
        cost_type: costType,
        cost_amount: costAmount
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
        await db.run(
          `UPDATE points SET ${pointType} = ${pointType} + ? WHERE user_id = ?`,
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
          [userId, pointType, amount, (finalPoints as any)[pointType], `盲盒中奖`, rewardId, 'lucky_box_reward']
        );
        
        result.reward_type = 'points';
        result.reward_point_type = pointType;
        result.reward_amount = amount;
        result.final_balance = finalPoints;
        
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
        
        result.reward_type = 'product';
        result.product = product;
        result.product_id = drawnItem.item_value;
      }
      
      // 记录兑换记录到普通兑换表
      await db.run(
        'INSERT INTO redemptions (user_id, reward_id, redeemed_at, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
        [userId, rewardId, 'approved']
      );
      
      // 记录到盲盒专用兑换历史表，保存更详细的信息
      await db.run(
        `INSERT INTO lucky_box_redemptions 
         (user_id, lucky_box_id, item_id, item_name, item_type, item_value, is_special) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, 
          rewardId, 
          drawnItem.id,
          drawnItem.name,
          drawnItem.item_type,
          drawnItem.item_type === 'product' ? null : drawnItem.probability, // 对于积分类型，记录概率值
          drawnItem.is_special || false
        ]
      );
      
      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json(result);
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      console.error('Transaction error during lucky box redemption:', error);
      throw error;
    }
  } catch (error) {
    console.error('Lucky box redemption error:', error);
    return NextResponse.json(
      { 
        message: '服务器错误',
        errorDetails: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}