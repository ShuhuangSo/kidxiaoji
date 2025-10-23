import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// 打开数据库连接的辅助函数
async function openDB() {
  const db = await open({
    filename: path.join(process.cwd(), 'database.db'),
    driver: sqlite3.Database
  });
  return db;
}

// 处理POST请求，模拟用户完成每日任务
export async function POST(request: Request) {
  try {
    // 获取用户ID
    const userId = request.headers.get('x-user-id');
    
    // 验证用户ID
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用户身份验证失败'
      }, { status: 401 });
    }
    
    // 打开数据库连接
    const db = await openDB();
    
    try {
      // 创建用户活动表（如果不存在）
      await db.run(`
        CREATE TABLE IF NOT EXISTS user_activity (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          activity_type TEXT NOT NULL,
          activity_date DATETIME NOT NULL,
          activity_data TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(activity_date);
      `);
      
      // 记录用户完成每日任务的活动
      await db.run(
        `INSERT INTO user_activity (user_id, activity_type, activity_date, activity_data) 
         VALUES (?, 'daily_task_complete', datetime('now'), ?)`,
        [userId, JSON.stringify({ task_type: 'daily', completed: true })]
      );
      
      // 返回成功响应
      return NextResponse.json({
        success: true,
        message: '用户任务完成记录已创建',
        data: {
          userId: userId,
          activityType: 'daily_task_complete',
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      // 确保关闭数据库连接
      await db.close();
    }
  } catch (error) {
    console.error('创建用户任务完成记录失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建用户任务完成记录失败，请稍后重试'
    }, { status: 500 });
  }
}