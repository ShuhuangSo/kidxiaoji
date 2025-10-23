import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取所有连胜天数奖励
export async function GET(request: NextRequest) {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    // 获取查询参数
    const userId = request.nextUrl.searchParams.get('user_id');
    
    let query = `
      SELECT sr.id, sr.streak_days, sr.cycle_type, sr.cycle_days, sr.reward_type, sr.reward_amount, sr.product_id,
             r.name as product_name
      FROM streak_length_rewards sr
      LEFT JOIN rewards r ON sr.product_id = r.id
      ORDER BY sr.cycle_days ASC
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
    console.error('获取连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '获取连胜天数奖励失败' },
      { status: 500 }
    );
  }
}

// 添加新的连胜天数奖励
export async function POST(request: NextRequest) {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    const data = await request.json();
    console.log('接收到的请求数据:', data);
    
    // 设置默认的cycle_type为'cycle'
    const cycle_type = data.cycle_type || 'cycle';
    const { cycle_days, reward_type, reward_amount, product_id } = data;
    
    console.log('处理后的参数:', { cycle_type, cycle_days, reward_type, reward_amount, product_id });
    
    // 验证必要字段
    if (!cycle_days || !reward_type) {
      console.log('缺少必要字段');
      return NextResponse.json(
        { success: false, message: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    // 验证周期天数必须为正整数
    if (!Number.isInteger(cycle_days) || cycle_days <= 0) {
      console.log('周期天数验证失败');
      return NextResponse.json(
        { success: false, message: '周期天数必须为正整数' },
        { status: 400 }
      );
    }
    
    // 根据奖励类型验证数量或产品ID
    if (reward_type !== 'product' && (!reward_amount || reward_amount <= 0)) {
      console.log('奖励数量验证失败');
      return NextResponse.json(
        { success: false, message: '请设置有效的奖励数量' },
        { status: 400 }
      );
    }
    
    if (reward_type === 'product' && !product_id) {
      console.log('产品ID验证失败');
      return NextResponse.json(
        { success: false, message: '请选择产品' },
        { status: 400 }
      );
    }
    
    // 检查是否已存在该周期的奖励
    console.log('检查重复周期奖励:', cycle_days, cycle_type);
    const existingReward = await db.get(
      'SELECT id FROM streak_length_rewards WHERE cycle_days = ? AND cycle_type = ?', 
      [cycle_days, cycle_type]
    );
    if (existingReward) {
      console.log('周期奖励已存在');
      return NextResponse.json(
        { success: false, message: `该${cycle_type === 'cycle' ? '周期' : '特定天数'}已存在奖励设置` },
        { status: 400 }
      );
    }
    
    try {
      // 插入新的连胜天数奖励，使用await db.run
      console.log('准备插入数据到数据库');
      const result = await db.run(
        `INSERT INTO streak_length_rewards (cycle_type, cycle_days, reward_type, reward_amount, product_id)
         VALUES (?, ?, ?, ?, ?)`,
        [cycle_type, cycle_days, reward_type, reward_amount || null, product_id || null]
      );
      
      console.log('数据插入成功，lastID:', result.lastID);
      return NextResponse.json({
        success: true,
        message: '连胜天数奖励添加成功',
        id: result.lastID
      });
    } catch (dbError) {
      console.error('数据库插入错误:', dbError);
      return NextResponse.json(
        { success: false, message: `数据库错误: ${String(dbError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('添加连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: `添加失败: ${String(error)}` },
      { status: 500 }
    );
  }
}

// 更新连胜天数奖励
export async function PUT(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // 获取URL中的ID参数
    const urlParts = request.nextUrl.pathname.split('/');
    const id = parseInt(urlParts[urlParts.length - 1]);
    
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, message: '无效的奖励ID' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    console.log('更新请求数据:', data, 'ID:', id);
    
    // 设置默认的cycle_type为'cycle'
    const cycle_type = data.cycle_type || 'cycle';
    const { cycle_days, reward_type, reward_amount, product_id } = data;
    
    // 验证必要字段
    if (!cycle_days || !reward_type) {
      return NextResponse.json(
        { success: false, message: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    // 验证周期天数必须为正整数
    if (!Number.isInteger(cycle_days) || cycle_days <= 0) {
      return NextResponse.json(
        { success: false, message: '周期天数必须为正整数' },
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
    
    // 检查要更新的记录是否存在
    const existingReward = await db.get(
      'SELECT id FROM streak_length_rewards WHERE id = ?', 
      [id]
    );
    
    if (!existingReward) {
      return NextResponse.json(
        { success: false, message: '奖励记录不存在' },
        { status: 404 }
      );
    }
    
    // 检查更新后的cycle_days和cycle_type组合是否与其他记录冲突
    const conflictReward = await db.get(
      'SELECT id FROM streak_length_rewards WHERE cycle_days = ? AND cycle_type = ? AND id != ?', 
      [cycle_days, cycle_type, id]
    );
    
    if (conflictReward) {
      return NextResponse.json(
        { success: false, message: `该${cycle_type === 'cycle' ? '周期' : '特定天数'}已存在奖励设置` },
        { status: 400 }
      );
    }
    
    try {
      // 更新数据库记录
      const result = await db.run(
        `UPDATE streak_length_rewards 
         SET cycle_type = ?, cycle_days = ?, reward_type = ?, reward_amount = ?, product_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cycle_type, cycle_days, reward_type, reward_amount || null, product_id || null, id]
      );
      
      if (typeof result?.changes === 'number' && result.changes > 0) {
        console.log('数据更新成功');
        return NextResponse.json({
          success: true,
          message: '连胜天数奖励更新成功'
        });
      } else {
        return NextResponse.json(
          { success: false, message: '更新失败，可能记录不存在' },
          { status: 404 }
        );
      }
    } catch (dbError) {
      console.error('数据库更新错误:', dbError);
      return NextResponse.json(
        { success: false, message: `数据库错误: ${String(dbError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('更新连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: `更新失败: ${String(error)}` },
      { status: 500 }
    );
  }
}

// 删除连胜天数奖励
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // 获取URL中的ID参数
    const urlParts = request.nextUrl.pathname.split('/');
    const id = parseInt(urlParts[urlParts.length - 1]);
    
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, message: '无效的奖励ID' },
        { status: 400 }
      );
    }
    
    try {
      // 从数据库中删除记录
      const result = await db.run(
        'DELETE FROM streak_length_rewards WHERE id = ?',
        [id]
      );
      
      if (typeof result?.changes === 'number' && result.changes > 0) {
        console.log('数据删除成功');
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
    } catch (dbError) {
      console.error('数据库删除错误:', dbError);
      return NextResponse.json(
        { success: false, message: `数据库错误: ${String(dbError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('删除连胜天数奖励失败:', error);
    return NextResponse.json(
      { success: false, message: `删除失败: ${String(error)}` },
      { status: 500 }
    );
  }
}