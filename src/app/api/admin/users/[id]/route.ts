import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getLevelName } from '@/lib/levelUtils';

// 直接使用sqlite模块
async function getDb() {
  return await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
}

// 处理重置密码请求
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    // 验证用户ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
    }
    
    // 从请求体获取数据
    const body = await request.json();
    const { password, coins, diamonds, energy } = body;
    
    // 判断是重置密码还是修改积分
    const isPasswordReset = password !== undefined;
    const isPointsUpdate = coins !== undefined || diamonds !== undefined || energy !== undefined;
    
    if (!isPasswordReset && !isPointsUpdate) {
      return NextResponse.json({ message: '请提供密码或积分更新数据' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // 检查用户是否存在
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 重置密码
      if (isPasswordReset) {
        // 验证密码输入
        if (!password) {
          return NextResponse.json({ message: '新密码不能为空' }, { status: 400 });
        }
        
        if (password.length < 6) {
          return NextResponse.json({ message: '新密码长度至少为6位' }, { status: 400 });
        }
        
        // 更新密码
        await db.run(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [password, userId]
        );
      }
      
      // 修改积分
      if (isPointsUpdate) {
        // 获取当前积分信息
        const currentPoints = await db.get('SELECT coins, diamonds, energy FROM points WHERE user_id = ?', [userId]);
        
        if (!currentPoints) {
          // 如果用户没有积分记录，创建一个
          await db.run(
            'INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, consecutive_missed_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, coins || 0, diamonds || 0, energy || 0, 1, 0, 0]
          );
        } else {
          // 更新积分记录
          await db.run(
            'UPDATE points SET coins = ?, diamonds = ?, energy = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [coins, diamonds, energy, userId]
          );
          
          // 记录积分变动历史
          // 如果有金币变动，记录金币历史
          if (currentPoints.coins !== coins) {
            const changeAmount = coins - currentPoints.coins;
            await db.run(
              'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [userId, 'coin', changeAmount, coins, '管理员手动调整', null, 'admin_action']
            );
          }
          
          // 如果有钻石变动，记录钻石历史
          if (currentPoints.diamonds !== diamonds) {
            const changeAmount = diamonds - currentPoints.diamonds;
            await db.run(
              'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [userId, 'diamond', changeAmount, diamonds, '管理员手动调整', null, 'admin_action']
            );
          }
          
          // 如果有能量变动，记录能量历史
          if (currentPoints.energy !== energy) {
            const changeAmount = energy - currentPoints.energy;
            await db.run(
              'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [userId, 'energy', changeAmount, energy, '管理员手动调整', null, 'admin_action']
            );
          }
          
          // 移除这个内部返回，让函数继续执行到外部的返回
          // 提交事务 - 移除这行，避免重复提交
          // await db.run('COMMIT');
        }
      }
      
      // 提交事务
      await db.run('COMMIT');
      
      let message = '操作成功';
      if (isPasswordReset && isPointsUpdate) {
        message = '密码重置和积分修改成功';
      } else if (isPasswordReset) {
        message = '密码重置成功';
      } else if (isPointsUpdate) {
        message = '积分修改成功';
      }
      
      return NextResponse.json({ message }, { status: 200 });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }
    
    return NextResponse.json({ message: '密码重置成功' }, { status: 200 });
  } catch (error) {
    console.error('重置密码错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 处理删除用户请求
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    // 验证用户ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
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