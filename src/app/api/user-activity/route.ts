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

// 处理GET请求，获取用户活动记录
export async function GET(request: Request) {
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
      // 查询用户今天的活动记录，特别是daily_task_complete类型的活动
      const activities = await db.all(
        `SELECT * FROM user_activity 
         WHERE user_id = ? AND date(activity_date) = date('now') 
         ORDER BY activity_date DESC`,
        [userId]
      );
      
      // 检查是否有完成任务的记录
      const hasCompletedTaskToday = activities.some(activity => 
        activity.activity_type === 'daily_task_complete'
      );
      
      // 返回用户活动数据
      return NextResponse.json({
        success: true,
        data: {
          activities: activities,
          hasCompletedTaskToday: hasCompletedTaskToday
        }
      });
    } finally {
      // 确保关闭数据库连接
      await db.close();
    }
  } catch (error) {
    console.error('获取用户活动数据失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取用户活动数据失败，请稍后重试'
    }, { status: 500 });
  }
}