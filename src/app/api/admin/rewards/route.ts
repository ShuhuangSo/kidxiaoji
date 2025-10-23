import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    
    // 获取所有商品，包括隐藏和下架的（管理端使用）
    const rewards = await db.all(
      'SELECT * FROM rewards ORDER BY created_at DESC'
    );
    
    return NextResponse.json(rewards);
  } catch (error) {
    console.error('获取奖励产品列表错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, cost_type, cost_amount, icon = '🎁', is_active = true, is_hidden = false, is_special_product = false, reward_multiplier = 1.0, reward_point_type = null, min_level = 0 } = await request.json();
    
    if (!name || !cost_type || cost_amount === undefined) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 创建新奖励产品
    const result = await db.run(
      'INSERT INTO rewards (name, description, cost_type, cost_amount, icon, is_active, is_hidden, is_special_product, reward_multiplier, reward_point_type, min_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', cost_type, cost_amount, icon, is_active ? 1 : 0, is_hidden === true ? 1 : 0, is_special_product ? 1 : 0, reward_multiplier, reward_point_type, min_level]
    );
    
    // 获取新创建的奖励产品
    const newReward = await db.get(
      'SELECT * FROM rewards WHERE id = ?',
      [(result as any).lastID]
    );
    
    return NextResponse.json(newReward);
  } catch (error) {
    console.error('创建奖励产品错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
    try {
      // 从URL中解析ID参数并转换为数字
      const idStr = request.url.split('/').pop();
      const id = parseInt(idStr as string);
      if (isNaN(id)) {
        return NextResponse.json(
          { message: '无效的奖励ID' },
          { status: 400 }
        );
      }
      const updateData = await request.json();
      console.log('PUT请求接收到的数据:', updateData);
      console.log('min_level参数存在且类型:', updateData.min_level !== undefined, typeof updateData.min_level);
    
    const db = await getDatabase();
    
    // 构建更新字段
    const fields = [];
    const values = [];
    
    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.cost_type !== undefined) {
      fields.push('cost_type = ?');
      values.push(updateData.cost_type);
    }
    if (updateData.cost_amount !== undefined) {
      fields.push('cost_amount = ?');
      values.push(updateData.cost_amount);
    }
    if (updateData.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updateData.icon);
    }
    if (updateData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.is_active ? 1 : 0);
    }
    if (updateData.is_hidden !== undefined) {
      fields.push('is_hidden = ?');
      // 处理布尔值和数字值，确保1表示隐藏，0表示显示
      values.push(updateData.is_hidden === true || updateData.is_hidden === 1 ? 1 : 0);
    }
    if (updateData.is_special_product !== undefined) {
      fields.push('is_special_product = ?');
      values.push(updateData.is_special_product ? 1 : 0);
    }
    if (updateData.reward_multiplier !== undefined) {
      fields.push('reward_multiplier = ?');
      values.push(updateData.reward_multiplier);
    }
    if (updateData.reward_point_type !== undefined) {
      fields.push('reward_point_type = ?');
      values.push(updateData.reward_point_type);
    }
    if (updateData.min_level !== undefined) {
        console.log('处理min_level字段，值为:', updateData.min_level);
        fields.push('min_level = ?');
        values.push(updateData.min_level);
      }
    
    if (fields.length === 0) {
      return NextResponse.json(
        { message: '没有需要更新的字段' },
        { status: 400 }
      );
    }
    
    // 添加ID参数
    values.push(id);
    
      const sql = `UPDATE rewards SET ${fields.join(', ')} WHERE id = ?`;
      console.log('生成的SQL:', sql);
      console.log('SQL参数值:', values);
      // 更新奖励产品
      const result = await db.run(sql, values);
      console.log('更新结果:', result);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { message: '奖励产品不存在' },
        { status: 404 }
      );
    }
    
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