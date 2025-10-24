import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 直接使用sqlite模块连接数据库
async function getDb() {
  return await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
}

interface TransferRequest {
  fromUserId: number;
  toUserId: number;
  pointType: 'coin' | 'diamond';
  amount: number;
}

export async function POST(request: Request) {
  try {
    const body: TransferRequest = await request.json();
    const { fromUserId, toUserId, pointType, amount } = body;
    
    // 验证输入参数
    if (!fromUserId || !toUserId || !pointType || !amount) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 验证积分类型
    if (pointType !== 'coin' && pointType !== 'diamond') {
      return NextResponse.json(
        { message: '只能转账金币或钻石' },
        { status: 400 }
      );
    }
    
    // 验证转账金额
    if (amount <= 0) {
      return NextResponse.json(
        { message: '转账金额必须大于0' },
        { status: 400 }
      );
    }
    
    // 不能给自己转账
    if (fromUserId === toUserId) {
      return NextResponse.json(
        { message: '不能给自己转账' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 检查目标用户是否存在且不是管理员
      const targetUser = await db.get(
        'SELECT id, role FROM users WHERE id = ?',
        [toUserId]
      );
      
      if (!targetUser) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '目标用户不存在' },
          { status: 404 }
        );
      }
      
      if (targetUser.role === 'parent') {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '不能向管理员转账' },
          { status: 403 }
        );
      }
      
      // 检查转出用户的积分是否足够
      const sourcePoints = await db.get(
        `SELECT ${pointType === 'coin' ? 'coins' : 'diamonds'} as balance FROM points WHERE user_id = ?`,
        [fromUserId]
      );
      
      if (!sourcePoints || sourcePoints.balance < amount) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '积分不足' },
          { status: 400 }
        );
      }
      
      // 扣除转出用户的积分
      const dbPointType = pointType === 'coin' ? 'coins' : 'diamonds';
      const newSourceBalance = sourcePoints.balance - amount;
      
      await db.run(
        `UPDATE points SET ${dbPointType} = ${dbPointType} - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [amount, fromUserId]
      );
      
      // 增加接收用户的积分
      await db.run(
        `UPDATE points SET ${dbPointType} = ${dbPointType} + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [amount, toUserId]
      );
      
      // 获取接收用户的新余额
      const targetPoints = await db.get(
        `SELECT ${dbPointType} as balance FROM points WHERE user_id = ?`,
        [toUserId]
      );
      
      const newTargetBalance = targetPoints?.balance || amount;
      
      // 记录转出用户的积分变动历史，包含转账用户信息
      await db.run(
        'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type, from_user_id, to_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [fromUserId, pointType, -amount, newSourceBalance, '转账给用户', toUserId, 'user_transfer', null, toUserId]
      );
      
      // 记录接收用户的积分变动历史，包含转账用户信息
      await db.run(
        'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type, from_user_id, to_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [toUserId, pointType, amount, newTargetBalance, '收到转账', fromUserId, 'user_transfer', fromUserId, null]
      );
      
      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json({
        message: '转账成功',
        fromUserId,
        toUserId,
        pointType,
        amount
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('积分转账错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}