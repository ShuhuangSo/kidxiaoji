import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    
    // 获取所有可用且未隐藏的奖励
  // 处理数据库返回的数字类型布尔值
  const rewards = await db.all(
    'SELECT id, name, description, cost_type, cost_amount, icon, is_active, is_hidden, min_level FROM rewards WHERE is_active = true AND (is_hidden = false OR is_hidden = 0) ORDER BY cost_amount ASC'
  );
    
    return NextResponse.json(rewards);
  } catch (error) {
    console.error('获取奖励列表错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user_id, reward_id } = await request.json();
    
    if (!user_id || !reward_id) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 获取奖励信息
      const reward = await db.get(
        'SELECT cost_type, cost_amount FROM rewards WHERE id = ? AND is_active = true',
        [reward_id]
      );
      
      if (!reward) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '奖励不存在或已下架' },
          { status: 404 }
        );
      }
      
      // 获取用户积分信息
      const points = await db.get(
        'SELECT coins, diamonds FROM points WHERE user_id = ?',
        [user_id]
      );
      
      if (!points) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '用户积分信息不存在' },
          { status: 404 }
        );
      }
      
      // 检查积分是否足够
      if (
        (reward.cost_type === 'coin' && points.coins < reward.cost_amount) ||
        (reward.cost_type === 'diamond' && points.diamonds < reward.cost_amount)
      ) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '积分不足' },
          { status: 400 }
        );
      }
      
      // 扣除积分
      if (reward.cost_type === 'coin') {
        // 先获取当前积分
        const currentPoints = await db.get('SELECT coins FROM points WHERE user_id = ?', [user_id]);
        const newBalance = (currentPoints?.coins || 0) - reward.cost_amount;
        
        await db.run(
          'UPDATE points SET coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [reward.cost_amount, user_id]
        );
        
        // 记录积分变动历史
        await db.run(
          'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user_id, 'coin', -reward.cost_amount, newBalance, '兑换奖励', reward_id, 'reward']
        );
      } else if (reward.cost_type === 'diamond') {
        // 先获取当前积分
        const currentPoints = await db.get('SELECT diamonds FROM points WHERE user_id = ?', [user_id]);
        const newBalance = (currentPoints?.diamonds || 0) - reward.cost_amount;
        
        await db.run(
          'UPDATE points SET diamonds = diamonds - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [reward.cost_amount, user_id]
        );
        
        // 记录积分变动历史
        await db.run(
          'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user_id, 'diamond', -reward.cost_amount, newBalance, '兑换奖励', reward_id, 'reward']
        );
      }
      
      // 记录兑换
      await db.run(
        'INSERT INTO redemptions (user_id, reward_id, status) VALUES (?, ?, ?)',
        [user_id, reward_id, 'pending']
      );
      
      // 提交事务
      await db.run('COMMIT');
      
      // 获取更新后的用户积分信息
      const updatedPoints = await db.get(
        'SELECT coins, diamonds FROM points WHERE user_id = ?',
        [user_id]
      );
      
      return NextResponse.json({
        message: '兑换成功',
        points: {
          coins: updatedPoints?.coins || 0,
          diamonds: updatedPoints?.diamonds || 0
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('兑换奖励错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}