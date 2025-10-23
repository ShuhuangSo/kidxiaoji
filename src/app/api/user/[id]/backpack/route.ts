import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取用户背包物品
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // 验证用户ID是否有效
    if (!params.id) {
      return NextResponse.json(
        { message: '用户ID不能为空' },
        { status: 400 }
      );
    }
    
    const userId = params.id;
    console.log('获取用户背包物品，用户ID:', userId);
    
    const db = await getDatabase();
    
    // 获取用户的背包物品，包括从backpack和user_backpack两个表中查询
    // 首先查询传统的背包物品（从backpack表）
    const traditionalItems = await db.all(
      `SELECT b.id, b.reward_id as item_id, b.user_id, r.name as reward_name, 
              r.description, r.icon, b.acquired_time as added_at, b.status, b.use_time,
              'traditional' as source, 1 as quantity
       FROM backpack b
       JOIN rewards r ON b.reward_id = r.id
       WHERE b.user_id = ?`,
      [userId]
    );
    
    // 然后查询连胜奖励的商品（从user_backpack表），并从rewards表获取描述和图标
    const streakRewardItems = await db.all(
      `SELECT ub.id, ub.item_id, ub.user_id, ub.item_name as reward_name,
              COALESCE(r.description, '') as description, COALESCE(r.icon, '') as icon,
              ub.added_at, 'unused' as status, NULL as use_time,
              'streak_reward' as source, ub.quantity
       FROM user_backpack ub
       LEFT JOIN rewards r ON ub.item_id = r.id
       WHERE ub.user_id = ? AND ub.quantity > 0`,
      [userId]
    );
    
    // 合并两个表的物品，并按获取时间排序
    const allItems = [...traditionalItems, ...streakRewardItems]
      .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    
    return NextResponse.json(allItems);
  } catch (error) {
    console.error('获取背包物品失败:', error);
    return NextResponse.json(
      { message: '获取背包物品失败' },
      { status: 500 }
    );
  }
}