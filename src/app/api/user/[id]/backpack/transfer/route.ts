import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 转赠背包物品
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const body = await request.json();
    const { itemId, targetUserId } = body;
    
    console.log('转赠背包物品，用户ID:', userId, '物品ID:', itemId, '目标用户ID:', targetUserId);
    
    if (!userId || !itemId || !targetUserId) {
      return NextResponse.json(
        { message: '用户ID、物品ID和目标用户ID不能为空' },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { message: '不能转赠给自身' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
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
            isTraditionalBackpack = false;
          } else {
            throw new Error('物品不存在或已被使用');
          }
        } else {
          throw new Error('物品不存在或已被使用');
        }
      }

      // 验证目标用户是否存在
      const targetUser = await db.get('SELECT id FROM users WHERE id = ?', [targetUserId]);
      if (!targetUser) {
        throw new Error('目标用户不存在');
      }

      // 处理转赠逻辑
      if (isTraditionalBackpack) {
        // 从转出用户背包中删除物品
        await db.run(
          'DELETE FROM backpack WHERE id = ? AND user_id = ?',
          [itemId, userId]
        );

        // 添加到目标用户背包中
        await db.run(
          'INSERT INTO backpack (user_id, reward_id, acquired_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
          [targetUserId, item.reward_id, 'unused']
        );
      } else {
        // 处理连胜奖励物品
        // 减少转出用户的数量
        await db.run(
          'UPDATE user_backpack SET quantity = quantity - 1 WHERE id = ? AND user_id = ?',
          [itemId, userId]
        );

        // 检查目标用户是否已有该物品
        const existingTargetItem = await db.get(
          'SELECT id FROM user_backpack WHERE user_id = ? AND item_id = ?',
          [targetUserId, item.item_id]
        );

        if (existingTargetItem) {
          // 增加目标用户的数量
          await db.run(
            'UPDATE user_backpack SET quantity = quantity + 1 WHERE id = ?',
            [existingTargetItem.id]
          );
        } else {
          // 为目标用户创建新记录
          await db.run(
            'INSERT INTO user_backpack (user_id, item_id, item_name, quantity, added_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [targetUserId, item.item_id, item.reward_name, 1]
          );
        }

        // 清理数量为0的记录
        await db.run(
          'DELETE FROM user_backpack WHERE quantity <= 0',
          []
        );
      }

      // 记录转赠日志
      await db.run(
        'INSERT INTO reward_history (user_id, reward_type, reward_data, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, 'transfer_out', JSON.stringify({ item_id: itemId, target_user_id: targetUserId, item_name: item.reward_name })]
      );

      await db.run(
        'INSERT INTO reward_history (user_id, reward_type, reward_data, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [targetUserId, 'transfer_in', JSON.stringify({ item_id: item.reward_id || item.item_id, source_user_id: userId, item_name: item.reward_name })]
      );

      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json({ message: '物品转赠成功' });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('转赠物品失败:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '转赠物品失败' },
      { status: 500 }
    );
  }
}

// 获取可转赠的用户列表
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { message: '用户ID不能为空' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 获取其他子用户（不包括自己）
    const users = await db.all(
      `SELECT id, username FROM users 
       WHERE role = 'child' AND id != ? 
       ORDER BY username ASC`,
      [userId]
    );
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { message: '获取用户列表失败' },
      { status: 500 }
    );
  }
}