import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 将选定的非连胜日添加为冷冻日
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const body = await request.json();
    const { date } = body;
    
    console.log('添加冷冻日，用户ID:', userId, '日期:', date);
    
    if (!userId || !date) {
      return NextResponse.json(
        { message: '用户ID和日期不能为空' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // 检查该日期是否已经是连胜日或冷冻日
    const existingStreakDay = await db.get(
      `SELECT * FROM user_streak_dates WHERE user_id = ? AND streak_date = ?`,
      [userId, date]
    );
    
    if (existingStreakDay) {
      return NextResponse.json(
        { message: '该日期已经是连胜日，无法设置为冷冻日' },
        { status: 400 }
      );
    }
    
    const existingFrozenDay = await db.get(
      `SELECT * FROM user_frozen_dates WHERE user_id = ? AND frozen_date = ?`,
      [userId, date]
    );
    
    if (existingFrozenDay) {
      return NextResponse.json(
        { message: '该日期已经是冷冻日' },
        { status: 400 }
      );
    }
    
    // 添加冷冻日记录
    await db.run(
      `INSERT INTO user_frozen_dates (user_id, frozen_date) VALUES (?, ?)`,
      [userId, date]
    );
    
    // 同时从非连胜日表中删除该日期
    await db.run(
      `DELETE FROM user_missed_dates WHERE user_id = ? AND missed_date = ?`,
      [userId, date]
    );
    
    console.log('成功添加冷冻日:', date);
    
    // 重新计算连胜天数（可选，取决于业务逻辑）
    // 这里可以调用现有的连胜计算逻辑
    
    return NextResponse.json(
      { message: '冷冻日添加成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('添加冷冻日失败:', error);
    return NextResponse.json(
      { message: '添加冷冻日失败' },
      { status: 500 }
    );
  }
}