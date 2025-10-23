import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 计算重复任务的截止时间
function calculateRecurringExpiryTime(recurrence: string, baseTime?: string): string {
  const now = new Date();
  let expiryDate = baseTime ? new Date(baseTime) : now;
  
  // 确保从baseTime开始计算，而不是从当前时间
  if (!baseTime) {
    // 如果没有提供baseTime，则从当前时间开始
    expiryDate = new Date(now);
  }
  
  switch (recurrence) {
    case 'daily':
      // 每日任务：设置为今天的23:59:59
      expiryDate = new Date(now);
      expiryDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      // 每周任务：设置为一周后的23:59:59
      // 从过期时间开始加7天
      expiryDate.setDate(expiryDate.getDate() + 7);
      expiryDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      // 每月任务：设置为一个月后的23:59:59
      // 从过期时间开始加1个月
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      expiryDate.setHours(23, 59, 59, 999);
      break;
  }
  
  // 确保截止时间不会早于当前时间
  if (expiryDate <= now) {
    switch (recurrence) {
      case 'daily':
        // 确保是未来的某一天
        expiryDate = new Date(now);
        expiryDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        // 如果计算出的截止时间在过去，确保至少是一周后
        const daysToAdd = 7 - (now.getDay() - expiryDate.getDay() + 7) % 7;
        expiryDate = new Date(now);
        expiryDate.setDate(now.getDate() + daysToAdd);
        expiryDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        // 确保至少是下个月
        expiryDate = new Date(now);
        expiryDate.setMonth(now.getMonth() + 1);
        expiryDate.setHours(23, 59, 59, 999);
        break;
    }
  }
  
  return expiryDate.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { message: '缺少用户ID参数' },
        { status: 400 }
      );
    }
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    // 自动将过期任务标记为missed，并为重复任务创建新任务
    await updateExpiredTasks(db, now);
    
    // 确保所有可重复任务（每日、每周、每月）都分配给用户
    await ensureRecurringTasksAssigned(db, userId, today);
    
    // 确保所有非重复任务也分配给用户（只分配一次）
    await assignNonRecurringTasks(db, userId);
    
    // 获取任务数据
    let tasks = await db.all(`
      SELECT ut.id as user_task_id, t.id, t.title, t.description, t.reward_type, t.reward_amount, t.expiry_time, t.recurrence, 
      COALESCE(ut.status, 'pending') as status, t.has_limited_quota, t.quota_count, t.remaining_quota,
      CASE 
        WHEN t.has_limited_quota AND ut.id IS NOT NULL THEN 1 
        ELSE 0 
      END as is_assigned,
      COALESCE(ut.needs_approval, true) as needs_approval,
      COALESCE(ut.approval_status, 'pending') as approval_status
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ? AND ut.assigned_date = ?
      WHERE (t.target_user_id IS NULL OR t.target_user_id = ?)
      AND (
        -- 显示已分配给用户的任务
        ut.id IS NOT NULL OR 
        -- 显示所有任务
        1=1
      )
    `, [userId, today, userId]);
    
    // 先处理重复任务的截止时间，确保它们能正确更新到数据库
    const recurringTasks = tasks.filter((task: any) => task.recurrence !== 'none');
    if (recurringTasks.length > 0) {
      for (const task of recurringTasks) {
        if (task.expiry_time) {
          const newExpiryTime = calculateRecurringExpiryTime(task.recurrence, task.expiry_time);
          // 更新数据库中的截止时间
          await db.run(
            'UPDATE tasks SET expiry_time = ? WHERE id = ?',
            [newExpiryTime, task.id]
          );
          // 同时更新内存中的截止时间
          task.expiry_time = newExpiryTime;
        }
      }
    }
    
    // 过滤任务：今天日期之前已过期的pending任务不显示
    const processedTasks = tasks.filter((task: any) => {
      // 对于pending状态的任务，检查是否过期
      if (task.status === 'pending' && task.expiry_time) {
        const expiryDateStr = new Date(task.expiry_time).toISOString().split('T')[0];
        // 如果过期日期是今天之前，则过滤掉
        return expiryDateStr >= today;
      }
      // 其他状态的任务（completed或missed）保留
      return true;
    });
    
    return NextResponse.json(processedTasks);
  } catch (error) {
    console.error('获取任务错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 自动将过期任务标记为missed，并为重复任务创建新任务
async function updateExpiredTasks(db: any, now: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // 创建明天的日期，用于比较
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowISO = tomorrow.toISOString();
  
  // 获取所有过期的任务信息（只标记昨天及以前的任务为过期）
  const expiredTasks = await db.all(`
    SELECT ut.user_id, ut.task_id, t.recurrence, t.expiry_time
    FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.status = 'pending' AND t.expiry_time < ?
  `, [tomorrowISO]);
  
  // 开始事务
  await db.run('BEGIN TRANSACTION');
  
  try {
      // 将所有过期任务标记为missed（只标记昨天及以前的任务为过期）
      await db.run(`
        UPDATE user_tasks 
        SET status = 'missed'
        WHERE status = 'pending' 
        AND EXISTS (
          SELECT 1 FROM tasks 
          WHERE tasks.id = user_tasks.task_id 
          AND tasks.expiry_time IS NOT NULL 
          AND tasks.expiry_time < ?
        )
      `, [tomorrowISO]);
      
      // 重置今天截止但被错误标记为missed的任务
      const todayStartISO = new Date(today).toISOString();
      await db.run(`
        UPDATE user_tasks 
        SET status = 'pending'
        WHERE status = 'missed' 
        AND EXISTS (
          SELECT 1 FROM tasks 
          WHERE tasks.id = user_tasks.task_id 
          AND tasks.expiry_time IS NOT NULL 
          AND tasks.expiry_time >= ?
          AND tasks.expiry_time < ?
        )
      `, [todayStartISO, tomorrowISO]);
    
    // 为每个重复任务创建新的任务记录并更新截止时间
    for (const expiredTask of expiredTasks as any[]) {
      // 只处理可重复的任务
      if (expiredTask.recurrence !== 'none') {
        // 计算新的截止时间
        const newExpiryTime = calculateRecurringExpiryTime(expiredTask.recurrence, expiredTask.expiry_time);
        
        // 更新原任务的截止时间
        await db.run(
          'UPDATE tasks SET expiry_time = ? WHERE id = ?',
          [newExpiryTime, expiredTask.task_id]
        );
        
        // 检查今天是否已经为该用户分配了该任务
        const existing = await db.get(
          'SELECT 1 FROM user_tasks WHERE user_id = ? AND task_id = ? AND assigned_date = ? AND status = ?',
          [expiredTask.user_id, expiredTask.task_id, today, 'pending']
        );
        
        // 使用INSERT OR IGNORE避免唯一性约束冲突
        await db.run(
          'INSERT OR IGNORE INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
          [expiredTask.user_id, expiredTask.task_id, 'pending', today]
        );
      }
    }
    
    // 提交事务
    await db.run('COMMIT');
  } catch (error) {
    // 发生错误时回滚事务
    await db.run('ROLLBACK');
    throw error;
  }
}

// 确保所有可重复任务都分配给用户
async function ensureRecurringTasksAssigned(db: any, userId: string, today: string) {
  // 获取所有可重复任务（每日、每周、每月），包括没有指定用户或指定了当前用户的任务
  // 但排除有限量配额的任务，这些任务需要用户手动领取
  const recurringTasks = await db.all(`
    SELECT id, recurrence, expiry_time
    FROM tasks 
    WHERE recurrence IN ('daily', 'weekly', 'monthly') 
    AND (target_user_id IS NULL OR target_user_id = ?)
    AND has_limited_quota = 0
  `, [userId]);
  
  for (const task of recurringTasks as any[]) {
    // 计算并更新任务的截止时间
    const newExpiryTime = calculateRecurringExpiryTime(task.recurrence, task.expiry_time);
    
    // 更新任务表中的截止时间
    await db.run(
      'UPDATE tasks SET expiry_time = ? WHERE id = ?',
      [newExpiryTime, task.id]
    );
    
    // 使用INSERT OR IGNORE避免唯一性约束冲突
    await db.run(
      'INSERT OR IGNORE INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
      [userId, task.id, 'pending', today]
    );
  }
}

// 分配所有非重复任务给用户（每天都分配一次）
async function assignNonRecurringTasks(db: any, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // 获取所有非重复任务
  // 只获取没有指定用户或指定了当前用户的任务
  const nonRecurringTasks = await db.all(`
    SELECT t.id 
    FROM tasks t 
    WHERE t.recurrence = 'none' 
    AND (t.target_user_id IS NULL OR t.target_user_id = ?)
  `, [userId]);
  
  // 为用户分配这些非重复任务，使用INSERT OR IGNORE避免唯一性约束冲突
  for (const task of nonRecurringTasks as any[]) {
    await db.run(
      'INSERT OR IGNORE INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
      [userId, task.id, 'pending', today]
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, task_id, action } = await request.json();
    
    if (!user_id || !task_id) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    // 检查任务是否存在
    const task = await db.get(
      'SELECT * FROM tasks WHERE id = ?',
      [task_id]
    );
    
    if (!task) {
      return NextResponse.json(
        { message: '任务不存在' },
        { status: 404 }
      );
    }
    
    // 检查任务是否已过期
    if (task.expiry_time && task.expiry_time < now) {
      return NextResponse.json(
        { message: '任务已过期' },
        { status: 400 }
      );
    }
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      if (action === 'claim') {
        // 任务领取逻辑
        if (!task.has_limited_quota) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { message: '该任务不需要领取' },
            { status: 400 }
          );
        }

        // 检查任务剩余配额
        const taskWithQuota = await db.get(
          'SELECT remaining_quota FROM tasks WHERE id = ?',
          [task_id]
        );

        if (taskWithQuota.remaining_quota <= 0) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { message: '任务份数已用完' },
            { status: 400 }
          );
        }

        // 检查用户是否已领取
        const existingAssignment = await db.get(
          'SELECT * FROM user_tasks WHERE task_id = ? AND user_id = ? AND assigned_date = ?',
          [task_id, user_id, today]
        );

        if (existingAssignment) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { message: '您已经领取过该任务' },
            { status: 400 }
          );
        }

        // 创建任务分配记录
        const result = await db.run(
          'INSERT INTO user_tasks (user_id, task_id, status, assigned_date, needs_approval, approval_status) VALUES (?, ?, ?, ?, ?, ?)',
          [user_id, task_id, 'pending', today, true, 'pending']
        );
        
        // 减少剩余配额
        await db.run(
          'UPDATE tasks SET remaining_quota = remaining_quota - 1 WHERE id = ?',
          [task_id]
        );

        await db.run('COMMIT');
        return NextResponse.json({
          message: '任务领取成功，等待管理员审核',
          user_task_id: result.lastID,
          needs_approval: true,
          approval_status: 'pending',
          reward_type: task.reward_type,
          reward_amount: task.reward_amount
        });
      } else if (action === 'complete' || !action) {
        // 任务完成逻辑
        // 检查任务分配
        let userTask = await db.get(
          'SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ? AND status = ? AND assigned_date = ?',
          [user_id, task_id, 'pending', today]
        );

        // 任务分配检查简化，所有任务都需要先创建分配记录

        if (!userTask) {
          // 对于无限量任务，检查是否已达到当天完成次数限制（可选）
          const completedCount = await db.get(
            'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND task_id = ? AND status = ? AND assigned_date = ?',
            [user_id, task_id, 'completed', today]
          );
          
          // 对于非重复任务，如果已经完成过，不允许再次创建
          if (task.recurrence === 'none' && completedCount.count > 0) {
            await db.run('ROLLBACK');
            return NextResponse.json(
              { message: '该任务已经完成过了' },
              { status: 400 }
            );
          }
          
          // 可以创建新的分配记录，使用INSERT OR IGNORE避免唯一性约束冲突
          await db.run(
            'INSERT OR IGNORE INTO user_tasks (user_id, task_id, status, assigned_date) VALUES (?, ?, ?, ?)',
            [user_id, task_id, 'pending', today]
          );
          
          userTask = await db.get(
            'SELECT last_insert_rowid() as id FROM user_tasks'
          );
        }

        if (!userTask) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { message: '未领取任务或任务状态错误' },
            { status: 400 }
          );
        }

        // 更新任务状态为已完成
        const result = await db.run(
          `UPDATE user_tasks 
           SET status = 'completed', 
               completed_at = CURRENT_TIMESTAMP,
               approval_status = 'pending'
           WHERE id = ?`,
          [userTask.id]
        );
        
        if (result.changes === 0) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { message: '任务已完成或不存在' },
            { status: 400 }
          );
        }
        
        // 不再立即更新用户积分，等待审核通过后再更新
        
        // 提交事务
        await db.run('COMMIT');
        
        // 获取更新后的用户积分信息（未实际增加积分）
        const points = await db.get(
          'SELECT coins, diamonds, energy, level, streak_days FROM points WHERE user_id = ?',
          [user_id]
        );
        
        return NextResponse.json({
          message: '任务完成成功，等待管理员审核',
          points: {
            coins: points?.coins || 0,
            diamonds: points?.diamonds || 0,
            energy: points?.energy || 0,
            level: points?.level || 1,
            streak_days: points?.streak_days || 0
          },
          needs_approval: true,
          approval_status: 'pending',
          reward_type: task.reward_type,
          reward_amount: task.reward_amount
        });
      } else {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '未知操作类型' },
          { status: 400 }
        );
      }
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('操作任务错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}