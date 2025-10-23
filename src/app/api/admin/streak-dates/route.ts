import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取用户连胜日期的API
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { message: '缺少用户ID参数' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 获取用户连胜日期记录
    const streakDates = await db.all(
      'SELECT streak_date FROM user_streak_dates WHERE user_id = ? ORDER BY streak_date DESC',
      [userId]
    );
    
    // 获取用户非连胜日记录
    const missedDates = await db.all(
      'SELECT missed_date FROM user_missed_dates WHERE user_id = ? ORDER BY missed_date DESC',
      [userId]
    );
    
    // 获取用户冷冻日记录
    const frozenDates = await db.all(
      'SELECT frozen_date FROM user_frozen_dates WHERE user_id = ? ORDER BY frozen_date DESC',
      [userId]
    );
    
    // 获取用户连胜相关信息
    let userPoints = await db.get(
      'SELECT streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?',
      [userId]
    );
    
    // 无论何时都重新计算连胜天数，确保冷冻日被正确计入
    // 获取所有冷冻日数据并创建Set用于快速查找
    const frozenDatesData = await db.all(
      'SELECT frozen_date FROM user_frozen_dates WHERE user_id = ?',
      [userId]
    );
    const frozenDatesSet = new Set(frozenDatesData.map((date: any) => date.frozen_date));
    
    // 获取所有连胜日期并按时间升序排序
    const allStreakDates = await db.all(
      'SELECT streak_date FROM user_streak_dates WHERE user_id = ? ORDER BY streak_date ASC',
      [userId]
    );
    
    // 获取所有非连胜日数据并创建Set用于快速查找
    const missedDatesData = await db.all(
      'SELECT missed_date FROM user_missed_dates WHERE user_id = ?',
      [userId]
    );
    const missedDatesSet = new Set(missedDatesData.map((date: any) => date.missed_date));
    
    // 计算实际的连续连胜天数，包含冷冻日
    let actualStreakDays = 0;
    
    if (allStreakDates.length > 0) {
      // 从最新的连胜日期开始向前计算，检查是否存在连续的连胜
      // 正确的计算方法：从最新连胜日开始，向前遍历每一天，直到遇到非连胜日
      const sortedStreakDates = [...allStreakDates].sort((a, b) => 
        new Date(b.streak_date).getTime() - new Date(a.streak_date).getTime()
      );
      
      // 获取最新的连胜日期
      const latestStreakDate = new Date(sortedStreakDates[0].streak_date);
      actualStreakDays = 1; // 至少有一个连胜日期
      
      console.log(`从最新连胜日开始计算: ${latestStreakDate.toISOString().split('T')[0]}`);
      
      // 从最新连胜日的前一天开始向前检查
      let checkDate = new Date(latestStreakDate);
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (true) {
        const checkDateStr = checkDate.toISOString().split('T')[0];
        console.log(`检查日期: ${checkDateStr}`);
        
        // 如果是连胜日
        if (sortedStreakDates.some(d => d.streak_date === checkDateStr)) {
          actualStreakDays++;
          console.log(`发现连胜日${checkDateStr}，连胜天数增加到: ${actualStreakDays}`);
        }
        // 如果是冷冻日
        else if (frozenDatesSet.has(checkDateStr)) {
          actualStreakDays++;
          console.log(`发现冷冻日${checkDateStr}，连胜天数增加到: ${actualStreakDays}`);
        }
        // 如果是非连胜日，中断
        else if (missedDatesSet.has(checkDateStr)) {
          console.log(`发现非连胜日${checkDateStr}，连胜中断`);
          break;
        }
        // 如果既不是连胜日、冷冻日也不是非连胜日，视为中断
        else {
          console.log(`日期${checkDateStr}无记录，连胜中断`);
          break;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      console.log(`用户${userId}的实际连续连胜天数: ${actualStreakDays}`);
    }
    
    // 获取最后连胜日期
    const latestStreakDate = await db.get(
      'SELECT MAX(streak_date) as max_date FROM user_streak_dates WHERE user_id = ?',
      [userId]
    );
    
    // 重新计算连续非连胜日
    let consecutiveMissedDays = 0;
    if (latestStreakDate.max_date) {
      // 从最后连胜日期的第二天开始计算连续的非连胜日，忽略冷冻日
      const lastStreakDate = new Date(latestStreakDate.max_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let checkDate = new Date(lastStreakDate);
      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(0, 0, 0, 0);
      
      while (checkDate <= today) {
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // 检查是否是冷冻日
        if (frozenDatesSet.has(dateStr)) {
          console.log(`日期${dateStr}是冷冻日，跳过`);
        } else {
          // 检查这一天是否存在于非连胜日表中或不存在于连胜日表中
          const hasMissed = missedDatesSet.has(dateStr);
          const hasStreak = streakDates.some((date: any) => date.streak_date === dateStr);
          
          // 如果这一天是非连胜日，则增加连续非连胜日计数
          if (hasMissed || !hasStreak) {
            consecutiveMissedDays++;
            console.log(`日期${dateStr}是非连胜日，连续非连胜日计数=${consecutiveMissedDays}`);
          } else {
            // 如果遇到连胜日，则中断计数
            console.log(`发现连胜日${dateStr}，停止计算连续非连胜日`);
            break;
          }
        }
        
        checkDate.setDate(checkDate.getDate() + 1);
      }
    }
    
    // 只有当计算的连胜天数与数据库中的不同时，才更新数据库
    if (userPoints && userPoints.streak_days !== actualStreakDays) {
      await db.run(
        'UPDATE points SET streak_days = ?, consecutive_missed_days = ? WHERE user_id = ?',
        [actualStreakDays, consecutiveMissedDays, userId]
      );
      // 更新返回的用户积分信息
      userPoints = {
        ...userPoints,
        streak_days: actualStreakDays,
        consecutiveMissedDays
      };
    }
    
    return NextResponse.json({
      success: true,
      streakDates: streakDates.map((date: any) => date.streak_date),
      missedDates: missedDates.map((date: any) => date.missed_date),
      frozenDates: frozenDates.map((date: any) => date.frozen_date),
      streakInfo: userPoints || {
        streak_days: actualStreakDays,
        last_streak_date: latestStreakDate.max_date || null,
        consecutiveMissedDays
      }
    });
  } catch (error) {
    console.error('获取用户连胜日期失败:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 添加或修改用户连胜日期和非连胜日的API
    export async function POST(request: Request) {
      try {
        const { userId, date, action, type = 'streak' } = await request.json();
        
        // 获取北京时间今天（0时0分0秒）用于日期验证
        const now = Date.now();
        const beijingTimeOffset = 8 * 60 * 60 * 1000; // UTC+8
        const beijingToday = new Date(now + beijingTimeOffset);
        beijingToday.setHours(0, 0, 0, 0);
        const beijingTodayStr = beijingToday.toISOString().split('T')[0];
    
    if (!userId || !date || !action) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    if (action !== 'add' && action !== 'remove') {
          return NextResponse.json(
            { message: '无效的操作类型，必须是add或remove' },
            { status: 400 }
          );
        }
        
        if (type !== 'streak' && type !== 'missed' && type !== 'frozen') {
          return NextResponse.json(
            { message: '无效的日期类型，必须是streak、missed或frozen' },
            { status: 400 }
          );
        }
        
        // 重要：验证日期 - 非连胜日和冷冻日只能添加到昨天或更早的日期
        // 今天还未结束，不应该被标记为非连胜日或冷冻日
        if (action === 'add' && date === beijingTodayStr && (type === 'missed' || type === 'frozen')) {
          return NextResponse.json(
            { message: `今天(${beijingTodayStr})还未结束，不能添加为${type === 'missed' ? '非连胜日' : '冷冻日'}` },
            { status: 400 }
          );
        }
    
    const db = await getDatabase();
    
    // 确保冷冻日表存在
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_frozen_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        frozen_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, frozen_date)
      );
      CREATE INDEX IF NOT EXISTS idx_user_frozen_dates_user_id ON user_frozen_dates(user_id);
    `);
    
    // 开始事务
      await db.run('BEGIN TRANSACTION');
      
      console.log(`开始处理日期操作: 用户ID=${userId}, 日期=${date}, 操作=${action}, 类型=${type}`);
      
      try {
        if (type === 'streak') {
          // 处理连胜日期
          if (action === 'add') {
            // 添加连胜日期
            await db.run(
              'INSERT OR IGNORE INTO user_streak_dates (user_id, streak_date) VALUES (?, ?)',
              [userId, date]
            );
            // 如果同一天在非连胜日表中存在，删除它
            await db.run(
              'DELETE FROM user_missed_dates WHERE user_id = ? AND missed_date = ?',
              [userId, date]
            );
            // 如果同一天在冷冻日表中存在，删除它
            await db.run(
              'DELETE FROM user_frozen_dates WHERE user_id = ? AND frozen_date = ?',
              [userId, date]
            );
          } else if (action === 'remove') {
            // 移除连胜日期
            await db.run(
              'DELETE FROM user_streak_dates WHERE user_id = ? AND streak_date = ?',
              [userId, date]
            );
          }
        } else if (type === 'missed') {
          // 处理非连胜日
          if (action === 'add') {
            // 添加非连胜日
            await db.run(
              'INSERT OR IGNORE INTO user_missed_dates (user_id, missed_date) VALUES (?, ?)',
              [userId, date]
            );
            // 如果同一天在连胜日表中存在，删除它
            await db.run(
              'DELETE FROM user_streak_dates WHERE user_id = ? AND streak_date = ?',
              [userId, date]
            );
            // 如果同一天在冷冻日表中存在，删除它
            await db.run(
              'DELETE FROM user_frozen_dates WHERE user_id = ? AND frozen_date = ?',
              [userId, date]
            );
          } else if (action === 'remove') {
            // 移除非连胜日
            await db.run(
              'DELETE FROM user_missed_dates WHERE user_id = ? AND missed_date = ?',
              [userId, date]
            );
          }
        } else if (type === 'frozen') {
          // 处理冷冻日
          console.log(`处理冷冻日操作: ${action}`);
          if (action === 'add') {
            console.log(`添加冷冻日: ${date} 给用户 ${userId}`);
            // 添加冷冻日
            await db.run(
              'INSERT OR IGNORE INTO user_frozen_dates (user_id, frozen_date) VALUES (?, ?)',
              [userId, date]
            );
            // 如果同一天在连胜日表中存在，删除它
            await db.run(
              'DELETE FROM user_streak_dates WHERE user_id = ? AND streak_date = ?',
              [userId, date]
            );
            // 如果同一天在非连胜日表中存在，删除它
            await db.run(
              'DELETE FROM user_missed_dates WHERE user_id = ? AND missed_date = ?',
              [userId, date]
            );
            console.log(`冷冻日 ${date} 添加成功`);
          } else if (action === 'remove') {
            console.log(`移除冷冻日: ${date} 从用户 ${userId}`);
            // 移除冷冻日
            await db.run(
              'DELETE FROM user_frozen_dates WHERE user_id = ? AND frozen_date = ?',
              [userId, date]
            );
            console.log(`冷冻日 ${date} 移除成功`);
          }
        }
      
      // 重新计算连胜天数和最后连胜日期
      const latestStreakDate = await db.get(
        'SELECT MAX(streak_date) as max_date FROM user_streak_dates WHERE user_id = ?',
        [userId]
      );
      
      // 获取所有冷冻日数据
      const frozenDatesData = await db.all(
        'SELECT frozen_date FROM user_frozen_dates WHERE user_id = ?',
        [userId]
      );
      const frozenDatesSet = new Set(frozenDatesData.map((date: any) => date.frozen_date));
      
      // 关键修复：正确计算连续的连胜天数，考虑连胜日期之间的间隔，冷冻日算入连胜天数
      let actualStreakDays = 0;
      
      // 获取所有连胜日期并按时间升序排序
      const allStreakDates = await db.all(
        'SELECT streak_date FROM user_streak_dates WHERE user_id = ? ORDER BY streak_date ASC',
        [userId]
      );
      
      // 获取所有非连胜日数据
      const missedDatesData = await db.all(
        'SELECT missed_date FROM user_missed_dates WHERE user_id = ?',
        [userId]
      );
      const missedDatesSet = new Set(missedDatesData.map((date: any) => date.missed_date));
      

      
      if (allStreakDates.length > 0) {
        // 从最新的连胜日期开始向前计算，检查是否存在连续的连胜
        actualStreakDays = 1; // 至少有一个连胜日期
        
        // 从后往前遍历，检查连续性
        for (let i = allStreakDates.length - 1; i > 0; i--) {
          const currentDate = new Date(allStreakDates[i].streak_date);
          const prevDate = new Date(allStreakDates[i - 1].streak_date);
          
          console.log(`检查连胜日期连续性: 当前日期=${currentDate.toISOString().split('T')[0]}, 前一日期=${prevDate.toISOString().split('T')[0]}`);
          
          // 检查两个连胜日期之间是否有非连胜日
          let hasMissedDaysBetween = false;
          let frozenDaysBetween = 0; // 记录中间的冷冻日数量
          
          let checkDate = new Date(prevDate);
          checkDate.setDate(checkDate.getDate() + 1);
          
          while (checkDate < currentDate) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            // 如果这一天是非连胜日，标记为有非连胜日，中断检查
            if (missedDatesSet.has(checkDateStr)) {
              console.log(`发现非连胜日${checkDateStr}，连胜中断`);
              hasMissedDaysBetween = true;
              break;
            }
            // 如果这一天是冷冻日，增加冷冻日计数
            else if (frozenDatesSet.has(checkDateStr)) {
              frozenDaysBetween++;
              console.log(`发现冷冻日${checkDateStr}，计入连胜天数`);
            }
            checkDate.setDate(checkDate.getDate() + 1);
          }
          
          // 如果有非连胜日，中断连胜计算
          if (hasMissedDaysBetween) {
            console.log('连胜日期之间存在非连胜日，中断连胜计算');
            break;
          } else {
            // 没有非连胜日，增加连胜天数（包括中间的冷冻日）
            actualStreakDays += 1 + frozenDaysBetween;
            console.log(`连续连胜，当前连胜天数(包含${frozenDaysBetween}个冷冻日): ${actualStreakDays}`);
          }
        }
        
        console.log(`用户${userId}的实际连续连胜天数: ${actualStreakDays}`);
      }
      
      // 重新计算连续非连胜日
      let consecutiveMissedDays = 0;
      if (latestStreakDate.max_date) {
        // 从最后连胜日期的第二天开始计算连续的非连胜日，忽略冷冻日
        const lastStreakDate = new Date(latestStreakDate.max_date);
        
        // 获取北京时间今天（0时0分0秒）
        const now = Date.now();
        const beijingTimeOffset = 8 * 60 * 60 * 1000; // UTC+8
        const beijingToday = new Date(now + beijingTimeOffset);
        beijingToday.setHours(0, 0, 0, 0);
        
        // 计算北京时间昨天（0时0分0秒）
        const yesterdayBeijing = new Date(beijingToday);
        yesterdayBeijing.setDate(yesterdayBeijing.getDate() - 1);
        
        let checkDate = new Date(lastStreakDate);
        checkDate.setDate(checkDate.getDate() + 1);
        checkDate.setHours(0, 0, 0, 0);
        
        // 只检查到昨天，不包括今天（北京时间）
        while (checkDate <= yesterdayBeijing) {
          const dateStr = checkDate.toISOString().split('T')[0];
          
          // 检查是否是冷冻日
          if (frozenDatesSet.has(dateStr)) {
            console.log(`日期${dateStr}是冷冻日，跳过`);
          } else {
            // 检查这一天是否存在于非连胜日表中
            const hasMissed = await db.get(
              'SELECT 1 FROM user_missed_dates WHERE user_id = ? AND missed_date = ?',
              [userId, dateStr]
            );
            
            // 同时检查这一天是否不存在于连胜日表中
            const hasStreak = await db.get(
              'SELECT 1 FROM user_streak_dates WHERE user_id = ? AND streak_date = ?',
              [userId, dateStr]
            );
            
            // 如果这一天是非连胜日，则增加连续非连胜日计数
            if (hasMissed || !hasStreak) {
              consecutiveMissedDays++;
              console.log(`日期${dateStr}是非连胜日，连续非连胜日计数=${consecutiveMissedDays}`);
            } else {
              // 如果遇到连胜日，则中断计数
              console.log(`发现连胜日${dateStr}，停止计算连续非连胜日`);
              break;
            }
          }
          
          checkDate.setDate(checkDate.getDate() + 1);
        }
      }
      
      // 更新points表 - 使用正确计算的连续连胜天数
      await db.run(
        'UPDATE points SET streak_days = ?, last_streak_date = ?, consecutive_missed_days = ? WHERE user_id = ?',
        [actualStreakDays, latestStreakDate.max_date || null, consecutiveMissedDays, userId]
      );
      
      // 提交事务
      await db.run('COMMIT');
      
      const typeText = type === 'streak' ? '连胜日期' : type === 'missed' ? '非连胜日' : '冷冻日';
      return NextResponse.json({
        success: true,
        message: `${typeText}${action === 'add' ? '添加' : '移除'}成功`,
        actualStreakDays // 返回实际计算的连续连胜天数
      });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('修改用户连胜日期失败:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}