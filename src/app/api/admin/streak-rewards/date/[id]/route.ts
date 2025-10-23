import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取单个日期连胜奖励
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const db = await getDatabase();
    
    const reward = await db.get(`
      SELECT dr.id, dr.date, dr.reward_type, dr.reward_amount, dr.product_id,
             r.name as product_name
      FROM date_streak_rewards dr
      LEFT JOIN rewards r ON dr.product_id = r.id
      WHERE dr.id = ?
    `, [id]);
    
    if (!reward) {
      return NextResponse.json(
        { success: false, message: '日期连胜奖励不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reward
    });
  } catch (error) {
    console.error('获取日期连胜奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '获取日期连胜奖励失败' },
      { status: 500 }
    );
  }
}

// 更新日期连胜奖励
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    const { date, reward_type, reward_amount, product_id } = data;
    const db = await getDatabase();
    
    // 验证必要字段
    if (!date || !reward_type) {
      return NextResponse.json(
        { success: false, message: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    // 根据奖励类型验证数量或产品ID
    if (reward_type !== 'product' && (!reward_amount || reward_amount <= 0)) {
      return NextResponse.json(
        { success: false, message: '请设置有效的奖励数量' },
        { status: 400 }
      );
    }
    
    if (reward_type === 'product' && !product_id) {
      return NextResponse.json(
        { success: false, message: '请选择产品' },
        { status: 400 }
      );
    }
    
    // 检查奖励是否存在
    const existingReward = await db.get('SELECT id FROM date_streak_rewards WHERE id = ?', [id]);
    if (!existingReward) {
      return NextResponse.json(
        { success: false, message: '日期连胜奖励不存在' },
        { status: 404 }
      );
    }
    
    // 检查是否已存在其他记录使用该日期
    const dateConflict = await db.get(
      'SELECT id FROM date_streak_rewards WHERE date = ? AND id != ?',
      [date, id]
    );
    
    if (dateConflict) {
      return NextResponse.json(
        { success: false, message: '该日期已被其他奖励设置使用' },
        { status: 400 }
      );
    }
    
    // 更新日期连胜奖励
    await db.run(
      `UPDATE date_streak_rewards
       SET date = ?, reward_type = ?, reward_amount = ?, product_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [date, reward_type, reward_amount || null, product_id || null, id]
    );
    
    return NextResponse.json({
      success: true,
      message: '日期连胜奖励更新成功'
    });
  } catch (error) {
    console.error('更新日期连胜奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '更新日期连胜奖励失败' },
      { status: 500 }
    );
  }
}

// 删除日期连胜奖励
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const db = await getDatabase();
    
    // 检查奖励是否存在
    const existingReward = await db.get('SELECT id FROM date_streak_rewards WHERE id = ?', [id]);
    if (!existingReward) {
      return NextResponse.json(
        { success: false, message: '日期连胜奖励不存在' },
        { status: 404 }
      );
    }
    
    // 删除日期连胜奖励
    await db.run('DELETE FROM date_streak_rewards WHERE id = ?', [id]);
    
    return NextResponse.json({
      success: true,
      message: '日期连胜奖励删除成功'
    });
  } catch (error) {
    console.error('删除日期连胜奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '删除日期连胜奖励失败' },
      { status: 500 }
    );
  }
}