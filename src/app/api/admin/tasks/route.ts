import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    
    // 获取所有任务
    const tasks = await db.all(
      'SELECT t.*, u.username as target_username FROM tasks t LEFT JOIN users u ON t.target_user_id = u.id ORDER BY created_at DESC'
    );
    
    // 确保每个任务都有remaining_quota字段
    for (const task of tasks as any[]) {
      task.remaining_quota = task.remaining_quota || 0;
    }
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('获取任务列表错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, reward_type, reward_amount, recurrence = 'none', expiry_time, target_user_id, has_limited_quota = false, quota_count = 0 } = await request.json();
    
    if (!title || !reward_type || reward_amount === undefined) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 根据重复周期设置截止时间
    let calculatedExpiryTime = expiry_time;
    
    if (recurrence !== 'none') {
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
    
    // 创建新任务
    const result = await db.run(
      'INSERT INTO tasks (title, description, reward_type, reward_amount, is_daily, recurrence, expiry_time, target_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', reward_type, reward_amount, recurrence === 'daily', recurrence, calculatedExpiryTime || null, target_user_id || null]
    );
    
    // 获取新创建的任务
    const newTask = await db.get(
      'SELECT t.*, u.username as target_username FROM tasks t LEFT JOIN users u ON t.target_user_id = u.id WHERE t.id = ?',
      [(result as any).lastID]
    );
    
    const today = new Date().toISOString().split('T')[0];
    
    // 分配任务给用户 - 只对无配额限制的任务进行自动分配
    if (!has_limited_quota) {
      if (target_user_id) {
        // 如果指定了用户，则只分配给该用户
        await db.run(
          'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
          [target_user_id, (result as any).lastID, 'pending', today]
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
            [user.id, (result as any).lastID, 'pending', today]
          );
        }
      } else if (recurrence !== 'none') {
        // 对于其他重复类型的任务，也分配给用户
        const childUsers = await db.all(
          'SELECT id FROM users WHERE role = ?',
          ['child']
        );
        
        for (const user of childUsers) {
          await db.run(
            'INSERT INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
            [user.id, (result as any).lastID, 'pending', today]
          );
        }
      }
    }
    
    return NextResponse.json(newTask);
  } catch (error) {
    console.error('创建任务错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}