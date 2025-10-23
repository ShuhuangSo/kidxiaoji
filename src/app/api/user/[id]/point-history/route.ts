import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取用户积分变动历史
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('API调用: /api/user/[id]/point-history, params:', params);
    
    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      console.error('无效的用户ID:', params.id);
      return NextResponse.json(
        { error: '无效的用户ID' },
        { status: 400 }
      );
    }
    
    console.log('正在获取用户积分变动历史，用户ID:', userId);
    const db = await getDatabase();
    
    // 验证用户是否存在
    const user = await db.get(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      console.error('用户不存在，用户ID:', userId);
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 获取积分变动历史，按时间倒序排列
    // 关联tasks表获取任务名称，关联users表获取转账用户名称
    const pointHistory = await db.all(
      `SELECT 
        ph.id, 
        ph.point_type, 
        ph.change_amount, 
        ph.balance_after, 
        ph.reason, 
        ph.related_id, 
        ph.related_type, 
        ph.created_at,
        ph.from_user_id,
        ph.to_user_id,
        t.title as task_title,
        from_user.username as from_user_name,
        to_user.username as to_user_name
      FROM point_history ph
      LEFT JOIN tasks t ON ph.related_type = 'task' AND t.id = ph.related_id
      LEFT JOIN users from_user ON ph.from_user_id = from_user.id
      LEFT JOIN users to_user ON ph.to_user_id = to_user.id
      WHERE ph.user_id = ? 
      ORDER BY ph.created_at DESC 
      LIMIT 30`, // 限制返回最近30条记录，符合前端最多显示30条的要求
      [userId]
    );
    
    console.log(`获取到用户 ${userId} 的积分变动历史记录数:`, pointHistory.length);
    
    // 处理数据，直接使用reason字段的值（因为它已经包含了任务标题和原因）
    const processedHistory = pointHistory.map((item: any) => item);
    
    // 返回积分变动历史数据
    return NextResponse.json({
      pointHistory: processedHistory,
      totalCount: processedHistory.length
    });
    
  } catch (error) {
    console.error('获取积分变动历史错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}