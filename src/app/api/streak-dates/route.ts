import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join } from 'path';

// 辅助函数：获取北京时间格式的日期字符串 (YYYY-MM-DD)
function getBeijingDateString(date: Date): string {
  // 转换为北京时间（UTC+8）
  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 辅助函数：获取数据库连接
async function getDbConnection() {
  // 使用与db.ts中相同的数据库路径配置
  const dbPath = process.env.DATABASE_PATH || '/app/db/database.db';
  console.log(`数据库路径: ${dbPath}`);
  
  return await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export async function GET(request: Request) {
  let db = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    console.log(`收到获取连胜日期请求，用户ID: ${userId}`);
    
    if (!userId) {
      console.log('用户ID为空，返回400错误');
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }
    
    // 获取数据库连接
    console.log('正在连接数据库...');
    db = await getDbConnection();
    console.log('数据库连接成功');
    
    // 从数据库获取用户的连胜日期
    console.log(`查询用户ID ${userId} 的连胜日期`);
    const streakDates = await db.all(
      'SELECT streak_date FROM user_streak_dates WHERE user_id = ? ORDER BY streak_date DESC',
      [userId]
    );
    
    // 从数据库获取用户的非连胜日
    console.log(`查询用户ID ${userId} 的非连胜日`);
    const missedDates = await db.all(
      'SELECT missed_date FROM user_missed_dates WHERE user_id = ? ORDER BY missed_date DESC',
      [userId]
    );
    
    // 从数据库获取用户的冷冻日
    console.log(`查询用户ID ${userId} 的冷冻日`);
    const frozenDates = await db.all(
      'SELECT frozen_date FROM user_frozen_dates WHERE user_id = ? ORDER BY frozen_date DESC',
      [userId]
    );
    
    // 从数据库获取用户连胜相关信息
    console.log(`查询用户ID ${userId} 的连胜信息`);
    const streakInfo = await db.get(
      'SELECT streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?',
      [userId]
    );
    
    console.log(`连胜日期查询结果: ${JSON.stringify(streakDates)}`);
    console.log(`非连胜日查询结果: ${JSON.stringify(missedDates)}`);
    console.log(`冷冻日查询结果: ${JSON.stringify(frozenDates)}`);
    
    // 提取日期字符串并转换为北京时间格式
    const streakDatesIso = streakDates.map(item => {
      const date = new Date(item.streak_date);
      return getBeijingDateString(date);
    });
    let missedDatesIso = missedDates.map(item => {
      const date = new Date(item.missed_date);
      return getBeijingDateString(date);
    });
    const frozenDatesIso = frozenDates.map(item => {
      const date = new Date(item.frozen_date);
      return getBeijingDateString(date);
    });
    
    // 创建日期集合以便快速查找，使用北京时间格式
    const streakDatesSet = new Set(streakDatesIso.map(dateStr => {
      const date = new Date(dateStr);
      return getBeijingDateString(date);
    }));
    const missedDatesSet = new Set(missedDatesIso.map(dateStr => {
      const date = new Date(dateStr);
      return getBeijingDateString(date);
    }));
    const frozenDatesSet = new Set(frozenDatesIso.map(dateStr => {
      const date = new Date(dateStr);
      return getBeijingDateString(date);
    }));
    

    
    // 添加逻辑：计算过去30天内未完成连胜且非冷冻日的日期，标记为非连胜日
    console.log('开始计算过去30天内需要标记为非连胜日的日期');
    const today = new Date();
    // 直接使用北京时间进行日期计算
    const beijingTimeOffset = 8 * 60 * 60 * 1000; // UTC+8
    const now = today.getTime();
    
    // 计算北京时间今天（0时0分0秒）
    const beijingToday = new Date(now + beijingTimeOffset);
    beijingToday.setHours(0, 0, 0, 0);
    
    // 计算北京时间昨天（0时0分0秒）
    const yesterdayBeijing = new Date(beijingToday);
    yesterdayBeijing.setDate(yesterdayBeijing.getDate() - 1);
    
    // 计算北京时间30天前（0时0分0秒）
    const thirtyDaysAgoBeijing = new Date(beijingToday);
    thirtyDaysAgoBeijing.setDate(thirtyDaysAgoBeijing.getDate() - 30);
    
    // 要添加的非连胜日数量
    let addedMissedDaysCount = 0;
    
    console.log(`北京时间今天: ${getBeijingDateString(beijingToday)}`);
    console.log(`北京时间昨天: ${getBeijingDateString(yesterdayBeijing)}`);
    console.log(`北京时间30天前: ${getBeijingDateString(thirtyDaysAgoBeijing)}`);
    
    // 遍历过去30天的每一天，从30天前到昨天（包含）
    const currentDate = new Date(thirtyDaysAgoBeijing);
    
    // 确保只处理到昨天，不包括今天
    while (currentDate <= yesterdayBeijing) {
      // 直接使用当前日期（北京时间）获取日期字符串
      const dateStr = getBeijingDateString(currentDate);
      
      // 如果这一天不是连胜日，不是非连胜日，也不是冷冻日，则标记为非连胜日
      if (!streakDatesSet.has(dateStr) && !missedDatesSet.has(dateStr) && !frozenDatesSet.has(dateStr)) {
        console.log(`标记日期 ${dateStr} 为非连胜日`);
        
        // 插入到非连胜日表中
        try {
          await db.run(
            'INSERT OR IGNORE INTO user_missed_dates (user_id, missed_date) VALUES (?, ?)',
            [userId, dateStr]
          );
          addedMissedDaysCount++;
          // 更新内存中的集合，避免重复添加
          missedDatesSet.add(dateStr);
        } catch (insertError) {
          console.error(`添加非连胜日 ${dateStr} 失败:`, insertError);
        }
      }
      
      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`已成功添加 ${addedMissedDaysCount} 个非连胜日记录`);
    
    // 更新missedDatesIso数组，包含新添加的非连胜日
    if (addedMissedDaysCount > 0) {
      // 重新获取更新后的非连胜日数据
      const updatedMissedDates = await db.all(
        'SELECT missed_date FROM user_missed_dates WHERE user_id = ? ORDER BY missed_date DESC',
        [userId]
      );
      missedDatesIso = updatedMissedDates.map(item => {
        const date = new Date(item.missed_date);
        return getBeijingDateString(date);
      });
    }
    
    console.log(`为用户ID ${userId} 获取到 ${streakDatesIso.length} 个连胜日期`);
    console.log(`为用户ID ${userId} 获取到 ${missedDatesIso.length} 个非连胜日`);
    console.log(`为用户ID ${userId} 获取到 ${frozenDatesIso.length} 个冷冻日`);
    
    // 过滤掉当前日期的今天，确保不返回今天作为非连胜日
    console.log(`过滤前的非连胜日数量: ${missedDatesIso.length}`);
    
    // 获取当前系统日期的今天（按照YYYY-MM-DD格式）
    const currentDay = new Date();
    const year = currentDay.getFullYear();
    const month = String(currentDay.getMonth() + 1).padStart(2, '0');
    const day = String(currentDay.getDate()).padStart(2, '0');
    const currentDateString = `${year}-${month}-${day}`;
    
    console.log(`当前系统日期: ${currentDateString}`);
    
    // 过滤掉今天的日期
    const filteredMissedDatesIso = missedDatesIso.filter(dateStr => dateStr !== currentDateString);
    
    console.log(`过滤后的非连胜日数量: ${filteredMissedDatesIso.length}`);
    
    return NextResponse.json({ 
      success: true, 
      streakDatesIso,
      missedDatesIso: filteredMissedDatesIso,
      frozenDatesIso,
      streakInfo: streakInfo || {
        streak_days: 0,
        last_streak_date: null,
        consecutive_missed_days: 0
      }
    });
  } catch (error) {
    console.error('获取连胜日期失败:', error);
    return NextResponse.json({ 
      error: '获取连胜日期失败', 
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  } finally {
    // 确保关闭数据库连接
    if (db) {
      try {
        await db.close();
        console.log('数据库连接已关闭');
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
}