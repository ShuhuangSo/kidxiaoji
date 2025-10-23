import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取所有日期连胜奖励
export async function GET(request: NextRequest) {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    // 获取查询参数
    const userId = request.nextUrl.searchParams.get('user_id');
    
    let query = `
      SELECT dr.id, dr.date, dr.reward_type, dr.reward_amount, dr.product_id,
             r.name as product_name, r.description, r.icon
      FROM date_streak_rewards dr
      LEFT JOIN rewards r ON dr.product_id = r.id
    `;
    
    let params: any[] = [];
    
    if (userId) {
      // 如果提供了用户ID，可以进一步扩展查询
      // 这里仅作为示例，实际逻辑可能需要根据需求调整
    }
    
    // 使用await db.all来执行查询
    const rewards = await db.all(query, params) as any[];
    
    return NextResponse.json({
      success: true,
      rewards
    });
  } catch (error) {
    console.error('获取日期连胜奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '获取日期连胜奖励失败' },
      { status: 500 }
    );
  }
}