import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取单个用户的最新信息
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('API调用: /api/user/[id], params:', params);
    
    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      console.error('无效的用户ID:', params.id);
      return NextResponse.json(
        { error: '无效的用户ID' },
        { status: 400 }
      );
    }
    
    console.log('正在获取用户信息，用户ID:', userId);
    const db = await getDatabase();
    
    // 获取用户基本信息
    const user = await db.get(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );
    
    console.log('从数据库获取的用户信息:', user);
    
    if (!user) {
      console.error('用户不存在，用户ID:', userId);
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 获取用户积分信息（包含连胜日期和冻结日信息）
    let points = await db.get(
      'SELECT coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?',
      [userId]
    );
    
    console.log('从数据库获取的积分信息:', points);
    
    // 处理连胜和冻结日逻辑
    if (points) {
      // 统一使用UTC日期格式进行比较
      const today = new Date().toISOString().split('T')[0]; // 今天的日期（YYYY-MM-DD）
      const lastStreakDate = points.last_streak_date ? new Date(points.last_streak_date).toISOString().split('T')[0] : null;
      
      console.log(`[修复逻辑] 用户${userId}：today=${today}, lastStreakDate=${lastStreakDate}, streak_days=${points.streak_days}`);
      
      // 修复：如果最后连胜日期是今天但连胜天数为0，立即更新连胜天数为1
      if (lastStreakDate === today && points.streak_days === 0) {
        console.log(`[修复逻辑触发] 用户${userId}今天有连胜记录但streak_days为0，更新连胜天数为1`);
        
        await db.run(
          'UPDATE points SET streak_days = 1, consecutive_missed_days = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
          [userId]
        );
        
        // 同步更新连胜日期记录 - 插入今天的日期到user_streak_dates表
        await db.run(
          'INSERT OR IGNORE INTO user_streak_dates (user_id, streak_date) VALUES (?, ?)',
          [userId, today]
        );
        console.log(`[修复逻辑] 已同步更新用户 ${userId} 的连胜日期记录: ${today}`);
        
        // 重新获取更新后的积分信息
        points = await db.get('SELECT coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?', [userId]);
        console.log(`[修复后] 更新后的积分信息:`, points);
      }
      
      // 计算天数差 - 确保准确计算天数差异
      let daysDiff = 0;
      if (lastStreakDate) {
        const lastDate = new Date(lastStreakDate);
        const currentDate = new Date(today);
        daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`[天数差计算] 用户${userId}的天数差: ${daysDiff}天`);
      }
      
      // 关键修改：无论连续非连胜日多少天，都重新计算连胜天数，包含冷冻日
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
      
      // 获取所有冷冻日数据
      const frozenDatesData = await db.all(
        'SELECT frozen_date FROM user_frozen_dates WHERE user_id = ?',
        [userId]
      );
      const frozenDatesSet = new Set(frozenDatesData.map((date: any) => date.frozen_date));
      
      // 重新计算连续的连胜天数，考虑连胜日期之间的间隔，冷冻日算入连胜天数
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
      }
      
      console.log(`用户${userId}的实际连续连胜天数: ${actualStreakDays}`);
      
      // 只有当实际计算的连胜天数与数据库中的不同时才更新
      if (actualStreakDays !== points.streak_days) {
        console.log(`更新用户${userId}的连胜天数从${points.streak_days}到${actualStreakDays}，包含冷冻日`);
        await db.run(
          'UPDATE points SET streak_days = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
          [actualStreakDays, userId]
        );
        
        // 重新获取更新后的积分信息
        points = await db.get('SELECT coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?', [userId]);
      }
      
      // 如果最后连胜日期不是今天，且存在天数差，需要更新连续非连胜日
      if (lastStreakDate !== today && daysDiff > 0) {
        console.log(`用户${userId}的最后连胜日期${lastStreakDate}与今天${today}相差${daysDiff}天，更新连续非连胜日`);
        // 更新连续非连胜日数
        const newMissedDays = daysDiff; // 直接使用天数差，而不是累加
        
        // 如果连续非连胜日达到3个或更多，重置连胜
        if (newMissedDays >= 3) {
          // 这里已经通过上面的逻辑计算了实际连胜天数
          console.log(`用户${userId}连续非连胜日达到${newMissedDays}天，连胜天数为: ${actualStreakDays}`);
          
          // 更新连续非连胜日为0
          await db.run(
            'UPDATE points SET consecutive_missed_days = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
            [userId]
          );
          
          // 如果实际连胜天数为0，则删除所有连胜日期记录
          if (actualStreakDays === 0) {
            await db.run(
              'DELETE FROM user_streak_dates WHERE user_id = ?',
              [userId]
            );
            console.log(`已删除用户 ${userId} 的所有连胜日期记录`);
          } else if (allStreakDates.length > actualStreakDays) {
            // 如果有实际连胜天数，只保留相关的连胜日期记录
            const endIndex = allStreakDates.length - actualStreakDays;
            const datesToKeep = allStreakDates.slice(endIndex).map((date: any) => date.streak_date);
            
            // 删除不在保留列表中的连胜日期记录
            console.log(`删除中断前的连胜日期记录，保留${datesToKeep.length}条连续连胜记录`);
            await db.run(
              `DELETE FROM user_streak_dates WHERE user_id = ? AND streak_date NOT IN (${datesToKeep.map(() => '?').join(',')})`,
              [userId, ...datesToKeep]
            );
          }
          
          // 重新获取更新后的积分信息
          points = await db.get('SELECT coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?', [userId]);
        } else {
          // 否则只更新连续非连胜日数
          console.log(`用户${userId}连续非连胜日更新为${newMissedDays}天`);
          await db.run(
            'UPDATE points SET consecutive_missed_days = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
            [newMissedDays, userId]
          );
          
          // 重新获取更新后的积分信息
          points = await db.get('SELECT coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?', [userId]);
        }
      }
      
      // 检查今天是否已经连胜（最后连胜日期是今天）
      const isStreakToday = lastStreakDate === today;
      
      // 返回与前端期望格式一致的数据
      const responseData = {
        id: user.id,
        username: user.username,
        role: user.role,
        points: {
          coins: points?.coins || 0,
          diamonds: points?.diamonds || 0,
          energy: points?.energy || 0,
          level: points?.level || 1,
          streak_days: points?.streak_days || 0,
          consecutive_missed_days: points?.consecutive_missed_days || 0,
          is_streak_today: isStreakToday
        }
      };
      
      console.log('准备返回的响应数据:', responseData);
    return NextResponse.json(responseData);
  }
  
  // 如果用户没有积分记录
  const responseData = {
      id: user.id,
      username: user.username,
      role: user.role,
      points: {
        coins: 0,
        diamonds: 0,
        energy: 0,
        level: 1,
        streak_days: 0,
        consecutive_missed_days: 0,
        is_streak_today: false
      }
    };
    
    console.log('准备返回的响应数据:', responseData);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}