import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    const db = await getDatabase();
    
    // 首先检查产品是否存在
    const existingReward = await db.get(
      'SELECT * FROM rewards WHERE id = ?',
      [id]
    );
    
    if (!existingReward) {
      return NextResponse.json(
        { message: '奖励产品不存在' },
        { status: 404 }
      );
    }
    
    // 构建动态更新语句，只更新提供的字段
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    
    // 检查每个可能的字段，如果在更新数据中存在则添加到更新列表
    if (updateData.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fieldsToUpdate.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.cost_type !== undefined) {
      fieldsToUpdate.push('cost_type = ?');
      values.push(updateData.cost_type);
    }
    if (updateData.cost_amount !== undefined) {
      fieldsToUpdate.push('cost_amount = ?');
      values.push(updateData.cost_amount);
    }
    if (updateData.icon !== undefined) {
      fieldsToUpdate.push('icon = ?');
      values.push(updateData.icon);
    }
    if (updateData.is_active !== undefined) {
      fieldsToUpdate.push('is_active = ?');
      values.push(updateData.is_active);
    }
    if (updateData.is_special_product !== undefined) {
      fieldsToUpdate.push('is_special_product = ?');
      values.push(updateData.is_special_product);
    }
    if (updateData.is_hidden !== undefined) {
      fieldsToUpdate.push('is_hidden = ?');
      values.push(updateData.is_hidden);
    }
    if (updateData.reward_multiplier !== undefined) {
      fieldsToUpdate.push('reward_multiplier = ?');
      values.push(updateData.reward_multiplier);
    }
    if (updateData.reward_point_type !== undefined) {
      fieldsToUpdate.push('reward_point_type = ?');
      values.push(updateData.reward_point_type);
    }
    if (updateData.min_level !== undefined) {
      fieldsToUpdate.push('min_level = ?');
      values.push(updateData.min_level);
    }
    
    // 如果没有要更新的字段，直接返回现有奖励
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json(existingReward);
    }
    
    // 添加id到参数列表末尾
    values.push(id);
    
    // 构建并执行更新语句
    const result = await db.run(
      `UPDATE rewards SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      values
    );
    
    // 获取更新后的奖励产品
    const updatedReward = await db.get(
      'SELECT * FROM rewards WHERE id = ?',
      [id]
    );
    
    return NextResponse.json(updatedReward);
  } catch (error) {
    console.error('更新奖励产品错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    const db = await getDatabase();
    
    // 检查产品是否存在
    const existingReward = await db.get(
      'SELECT * FROM rewards WHERE id = ?',
      [id]
    );
    
    if (!existingReward) {
      return NextResponse.json(
        { message: '奖励产品不存在' },
        { status: 404 }
      );
    }
    
    // 执行删除操作
    await db.run(
      'DELETE FROM rewards WHERE id = ?',
      [id]
    );
    
    return NextResponse.json(
      { message: '奖励产品删除成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除奖励产品错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}