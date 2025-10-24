import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 使用与db.ts中相同的数据库路径配置
async function getDb() {
  const dbPath = process.env.DATABASE_PATH || '/app/db/database.db';
  console.log(`admin/users数据库路径: ${dbPath}`);
  return await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export async function GET(request: Request) {
  try {
    const db = await getDb();
    
    // 获取所有用户
    const users = await db.all(`
      SELECT u.id, u.username, u.role, u.created_at, p.coins, p.diamonds, p.energy, p.level, p.streak_days 
      FROM users u 
      LEFT JOIN points p ON u.id = p.user_id
    `);
    
    // 获取每个用户的任务状态
    const usersWithTasks = await Promise.all(users.map(async (user: any) => {
      const tasks = await db.all(`
        SELECT t.id, t.title, ut.status, ut.completed_at 
        FROM user_tasks ut 
        JOIN tasks t ON ut.task_id = t.id 
        WHERE ut.user_id = ? 
        ORDER BY ut.assigned_date DESC 
        LIMIT 10
      `, [user.id]);
      
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        points: {
          coins: user.coins || 0,
          diamonds: user.diamonds || 0,
          energy: user.energy || 0,
          level: user.level || 1,
          streak_days: user.streak_days || 0
        },
        tasks: tasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          completed_at: task.completed_at
        }))
      };
    }));
    
    return NextResponse.json(usersWithTasks);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 获取请求体数据
    const body = await request.json();
    console.log('接收到的请求体数据:', body);
    const { username, password, role } = body;
    
    // 验证输入
    console.log('验证输入:', { username, password: !!password, role });
    if (!username || !password || !role) {
      return NextResponse.json({ message: '用户名、密码和角色不能为空' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ message: '密码长度至少为6位' }, { status: 400 });
    }
    
    if (role !== 'parent' && role !== 'child') {
      return NextResponse.json(
        { message: '角色必须是parent或child' },
        { status: 400 }
      );
    }
    
    // 直接使用sqlite3连接
    const db = await getDb();
    
    // 检查用户名是否已存在
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json(
        { message: '用户名已存在' },
        { status: 400 }
      );
    }
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 插入用户，使用password_hash字段
      console.log('准备插入用户，参数:', { username, passwordHashExists: !!password, role });
      const result = await db.run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, password, role]
      );
      
      const userId = result.lastID;
      console.log('用户插入成功，ID:', userId);
      
      // 初始化积分
      await db.run(
        'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 0, 0, 0, 1, 0, 0]
      );
      
      // 提交事务
      await db.run('COMMIT');
      console.log('事务提交成功');
      
      // 返回新创建的用户信息
      return NextResponse.json({
        id: userId,
        username,
        role,
        points: {
          coins: 0,
          diamonds: 0,
          energy: 0,
          level: 1,
          streak_days: 0
        },
        tasks: []
      }, { status: 201 });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      console.error('添加用户事务失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('添加用户错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 处理重置密码和删除用户的请求 - 临时解决方案
export async function PUT(request: Request) {
  try {
    // 解析URL以获取用户ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    let userId: string | null = null;
    
    // 查找最后一个数字部分作为用户ID
    for (let i = pathParts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(pathParts[i])) {
        userId = pathParts[i];
        break;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ message: '未找到用户ID' }, { status: 400 });
    }
    
    // 从请求体获取密码
    const body = await request.json();
    const { password } = body;
    
    // 验证输入
    if (!password) {
      return NextResponse.json({ message: '新密码不能为空' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ message: '新密码长度至少为6位' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // 检查用户是否存在
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 更新密码
    await db.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password, userId]
    );
    
    return NextResponse.json({ message: '密码重置成功' }, { status: 200 });
  } catch (error) {
    console.error('重置密码错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // 解析URL以获取用户ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    let userId: string | null = null;
    
    // 查找最后一个数字部分作为用户ID
    for (let i = pathParts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(pathParts[i])) {
        userId = pathParts[i];
        break;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ message: '未找到用户ID' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // 检查用户是否存在
    const existingUser = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 不允许删除管理员用户（parent角色）
    if (existingUser.role === 'parent') {
      return NextResponse.json({ message: '不能删除管理员用户' }, { status: 403 });
    }
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 删除用户相关数据
      // 1. 删除用户任务记录
      await db.run('DELETE FROM user_tasks WHERE user_id = ?', [userId]);
      // 2. 删除用户积分记录
      await db.run('DELETE FROM points WHERE user_id = ?', [userId]);
      // 3. 删除用户记录
      await db.run('DELETE FROM users WHERE id = ?', [userId]);
      
      // 提交事务
      await db.run('COMMIT');
      
      return NextResponse.json({ message: '用户删除成功' }, { status: 200 });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      console.error('删除用户事务失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('删除用户错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}