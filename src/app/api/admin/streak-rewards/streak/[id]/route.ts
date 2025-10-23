import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取单个连胜天数奖励
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase();
    const id = parseInt(params.id);
    
    const query = `
      SELECT sr.id, sr.streak_days, sr.cycle_type, sr.cycle_days, sr.reward_type, sr.reward_amount, sr.product_id,
             r.name as product_name
      FROM streak_length_rewards sr
      LEFT JOIN rewards r ON sr.product_id = r.id
      WHERE sr.id = ?
    `;
    
    const reward = await db.get(query, [id]) as any;
    
    if (!reward) {
      return NextResponse.json(
        { success: false, message: '连胜天数奖励不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reward
    });
  } catch (error) {
    console.error('获取连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '获取连胜天数奖励失败' },
      { status: 500 }
    );
  }
}

// 更新连胜天数奖励
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase();
    const id = parseInt(params.id);
    const data = await request.json();
    const { cycle_type = 'cycle', cycle_days, reward_type, reward_amount, product_id } = data;
    
    // 验证必要字段
    if (!cycle_days || !reward_type) {
      return NextResponse.json(
        { success: false, message: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    // 验证周期天数
    if (cycle_days <= 0 || !Number.isInteger(cycle_days)) {
      return NextResponse.json(
        { success: false, message: '请设置有效的周期天数' },
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
    const existingReward = await db.get(
      'SELECT id FROM streak_length_rewards WHERE id = ?',
      [id]
    );
    
    if (!existingReward) {
      return NextResponse.json(
        { success: false, message: '连胜天数奖励不存在' },
        { status: 404 }
      );
    }
    
    // 检查是否已存在其他记录使用该周期
    const daysConflict = await db.get(
      'SELECT id FROM streak_length_rewards WHERE cycle_days = ? AND cycle_type = ? AND id != ?',
      [cycle_days, cycle_type, id]
    );
    
    if (daysConflict) {
      return NextResponse.json(
        { success: false, message: `该${cycle_type === 'cycle' ? '周期' : '特定天数'}已被其他奖励设置使用` },
        { status: 400 }
      );
    }
    
    // 更新连胜天数奖励
    const result = await db.run(
      `UPDATE streak_length_rewards
       SET cycle_type = ?, cycle_days = ?, reward_type = ?, reward_amount = ?, product_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cycle_type, cycle_days, reward_type, reward_amount || null, product_id || null, id]
    );
    
    if (typeof result?.changes === 'number' && result.changes > 0) {
      return NextResponse.json({
        success: true,
        message: '连胜天数奖励更新成功'
      });
    } else {
      return NextResponse.json(
        { success: false, message: '更新失败，记录不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('更新连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '更新连胜天数奖励失败' },
      { status: 500 }
    );
  }
}

// 删除连胜天数奖励
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase();
    const id = parseInt(params.id);
    
    // 检查奖励是否存在
    const existingReward = await db.get(
      'SELECT id FROM streak_length_rewards WHERE id = ?',
      [id]
    );
    
    if (!existingReward) {
      return NextResponse.json(
        { success: false, message: '连胜天数奖励不存在' },
        { status: 404 }
      );
    }
    
    // 删除连胜天数奖励
    const result = await db.run(
      'DELETE FROM streak_length_rewards WHERE id = ?',
      [id]
    );
    
    if (typeof result?.changes === 'number' && result.changes > 0) {
      return NextResponse.json({
        success: true,
        message: '连胜天数奖励删除成功'
      });
    } else {
      return NextResponse.json(
        { success: false, message: '删除失败，记录不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('删除连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '删除连胜天数奖励失败' },
      { status: 500 }
    );
  }
}