import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    // 获取数据库实例
    const db = await getDatabase();
    
    // 获取所有连胜周期奖励设置，并关联rewards表获取商品的实际名称和图标
    const streakRewards = await db.all(
      `SELECT slr.*, r.name as product_name, r.icon as product_icon 
       FROM streak_length_rewards slr
       LEFT JOIN rewards r ON slr.product_id = r.id
       ORDER BY cycle_days ASC`
    );

    return NextResponse.json(streakRewards);
  } catch (error) {
    console.error('获取连胜周期奖励失败:', error);
    return NextResponse.json(
      { error: '获取连胜周期奖励失败' },
      { status: 500 }
    );
  }
}