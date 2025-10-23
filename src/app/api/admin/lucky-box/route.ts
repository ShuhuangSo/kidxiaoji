import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取所有盲盒及其奖品配置
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // 获取所有盲盒商品
    const luckyBoxes = await db.all(
      `SELECT r.id, r.name, r.description, r.cost_type, r.cost_amount, r.icon, r.is_active, r.is_hidden
       FROM rewards r
       WHERE r.is_lucky_box = true
       ORDER BY r.created_at DESC`
    );
    
    // 获取每个盲盒的奖品配置
    for (const box of luckyBoxes as any) {
      box.items = await db.all(
        `SELECT l.id, l.item_type, l.item_value, l.item_detail, l.probability,
               CASE 
                 WHEN l.item_type = 'product' THEN r.name 
                 ELSE NULL 
               END as product_name,
               CASE 
                 WHEN l.item_type = 'product' THEN r.icon 
                 ELSE NULL 
               END as product_icon,
               CASE 
                 WHEN l.item_type = 'product' THEN r.description 
                 ELSE NULL 
               END as product_description
        FROM lucky_box_items l
        LEFT JOIN rewards r ON l.item_value = r.id AND l.item_type = 'product'
        WHERE l.lucky_box_id = ?
        ORDER BY l.probability DESC`,
        [box.id]
      );
    }
    
    return NextResponse.json(luckyBoxes);
  } catch (error) {
    console.error('获取盲盒配置失败:', error);
    return NextResponse.json(
      { message: '服务器错误', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 创建新的盲盒商品
export async function POST(request: NextRequest) {
  try {
    const { name, description, cost_type, cost_amount, icon, is_active, is_hidden } = await request.json();
    
    if (!name || !cost_type || !cost_amount || !icon) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 插入新的盲盒商品
    const result = await db.run(
      `INSERT INTO rewards (name, description, cost_type, cost_amount, icon, is_active, is_hidden, is_lucky_box)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', cost_type, cost_amount, icon, is_active !== false, is_hidden === true, true]
    );
    
    return NextResponse.json({
      id: (result as any).lastID,
      name,
      description,
      cost_type,
      cost_amount,
      icon,
      is_active: is_active !== false,
      is_hidden: is_hidden === true,
      items: []
    });
  } catch (error) {
    console.error('创建盲盒失败:', error);
    return NextResponse.json(
      { message: '服务器错误', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 更新盲盒基本信息
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, cost_type, cost_amount, icon, is_active, is_hidden } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { message: '缺少盲盒ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 更新盲盒信息
    await db.run(
      `UPDATE rewards
       SET name = ?, description = ?, cost_type = ?, cost_amount = ?, icon = ?, is_active = ?, is_hidden = ?
       WHERE id = ? AND is_lucky_box = true`,
      [name, description, cost_type, cost_amount, icon, is_active, is_hidden, id]
    );
    
    return NextResponse.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新盲盒失败:', error);
    return NextResponse.json(
      { message: '服务器错误', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 删除盲盒
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { message: '缺少盲盒ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 删除相关的奖品配置
      await db.run('DELETE FROM lucky_box_items WHERE lucky_box_id = ?', [id]);
      
      // 删除盲盒商品
      await db.run('DELETE FROM rewards WHERE id = ? AND is_lucky_box = true', [id]);
      
      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json({ message: '删除成功' });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('删除盲盒失败:', error);
    return NextResponse.json(
      { message: '服务器错误', error: (error as Error).message },
      { status: 500 }
    );
  }
}