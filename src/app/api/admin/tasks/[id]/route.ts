import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 更新任务
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { title, description, reward_type, reward_amount, recurrence, expiry_time, target_user_id, has_limited_quota = false, quota_count = 0 } = await request.json();
    
    if (!title || !reward_type || reward_amount === undefined) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 根据重复周期设置截止时间
    let calculatedExpiryTime = expiry_time;
    
    if (recurrence && recurrence !== 'none') {
      calculatedExpiryTime = new Date();
      
      switch (recurrence) {
        case 'daily':
          // 每日任务：设置为今天的23:59:59
          calculatedExpiryTime.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          // 每周任务：设置为一周后的23:59:59
          calculatedExpiryTime.setDate(calculatedExpiryTime.getDate() + 7);
          calculatedExpiryTime.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          // 每月任务：设置为一个月后的23:59:59
          calculatedExpiryTime.setMonth(calculatedExpiryTime.getMonth() + 1);
          calculatedExpiryTime.setHours(23, 59, 59, 999);
          break;
      }
      // 转换为ISO字符串
      calculatedExpiryTime = calculatedExpiryTime.toISOString();
    }
    
    const db = await getDatabase();
    
    // 更新任务
    const result = await db.run(
      'UPDATE tasks SET title = ?, description = ?, reward_type = ?, reward_amount = ?, is_daily = ?, recurrence = ?, expiry_time = ?, target_user_id = ? WHERE id = ?',
      [title, description || '', reward_type, reward_amount, recurrence === 'daily', recurrence, calculatedExpiryTime || null, target_user_id || null, id]
    );
    
    if (result.changes === 0) {
      return NextResponse.json(
        { message: '任务不存在' },
        { status: 404 }
      );
    }
    
    // 获取更新后的任务
    const updatedTask = await db.get(
      'SELECT t.*, u.username as target_username FROM tasks t LEFT JOIN users u ON t.target_user_id = u.id WHERE t.id = ?',
      [id]
    );
    
    // 如果任务是每日任务或指定了用户，重新分配任务
    const today = new Date().toISOString().split('T')[0];
    
    // 移除当前用户的任务分配
    await db.run('DELETE FROM user_tasks WHERE task_id = ? AND assigned_date = ?', [id, today]);
    
    // 重新分配任务
    if (target_user_id) {
      // 如果指定了用户，则只分配给该用户
      await db.run(
        'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
        [target_user_id, id, 'pending', today]
      );
    } else if (recurrence === 'daily') {
      // 如果是每日任务且未指定用户，则分配给所有儿童用户
      const childUsers = await db.all(
        'SELECT id FROM users WHERE role = ?',
        ['child']
      );
      
      for (const user of childUsers) {
        await db.run(
          'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
          [user.id, id, 'pending', today]
        );
      }
    }
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('更新任务错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除任务
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const db = await getDatabase();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 删除相关的用户任务
      await db.run(
        'DELETE FROM user_tasks WHERE task_id = ?',
        [id]
      );
      
      // 删除任务
      const result = await db.run(
        'DELETE FROM tasks WHERE id = ?',
        [id]
      );
      
      if (result.changes === 0) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '任务不存在' },
          { status: 404 }
        );
      }
      
      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json({
        message: '任务删除成功'
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('删除任务错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}