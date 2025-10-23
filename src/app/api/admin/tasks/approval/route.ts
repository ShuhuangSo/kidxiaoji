import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getUserMultipliedPoints } from '@/lib/special-effects';

// 将UTC时间转换为北京时间（UTC+8）
function convertUTCToBeijingTime(utcTime: string): string {
  const date = new Date(utcTime);
  // 添加8小时（28800000毫秒）
  date.setTime(date.getTime() + 8 * 60 * 60 * 1000);
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // 自动删除超过3天的数据
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // 开始事务处理删除操作
    await db.run('BEGIN TRANSACTION');
    try {
      // 删除超过3天的任务审核记录
      await db.run(
        'DELETE FROM user_tasks WHERE needs_approval = 1 AND completed_at < ?',
        [threeDaysAgo.toISOString()]
      );
      await db.run('COMMIT');
      console.log('已自动删除超过3天的任务审核记录');
    } catch (deleteError) {
      console.error('删除过期记录时出错:', deleteError);
      await db.run('ROLLBACK');
    }
    
    // 获取所有需要审核的任务，包含任务和用户信息，支持所有审核状态
    const statusParam = request.nextUrl.searchParams.get('status');
    let query = 'SELECT ut.id as user_task_id, ut.user_id, u.username, ut.task_id, t.title as task_title, t.description as task_description, t.reward_type, t.reward_amount, ut.completed_at as completed_date, ut.approval_status FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id JOIN users u ON ut.user_id = u.id WHERE ut.needs_approval = 1';
    
    // 对于已完成的任务，确保有completed_at字段
    query += ' AND (ut.status = \'completed\' OR (ut.status = \'pending\' AND t.has_limited_quota = 1))';
    
    // 添加日期过滤，只显示最近3天的数据
    query += ' AND ut.completed_at >= ?';
    
    // 如果有状态参数，则添加到查询条件中
    const queryParams = [threeDaysAgo.toISOString()];
    if (statusParam && ['pending', 'approved', 'rejected'].includes(statusParam)) {
      query += ' AND ut.approval_status = ?';
      queryParams.push(statusParam);
    }
    
    // 按时间排序
    query += ' ORDER BY ut.completed_at DESC';
    
    const tasks = await db.all(query, queryParams);
    
    // 将UTC时间转换为北京时间
    const tasksWithBeijingTime = tasks.map((task: any) => ({
      ...task,
      completed_date: task.completed_date ? convertUTCToBeijingTime(task.completed_date) : null
    }));
    
    return NextResponse.json(tasksWithBeijingTime);
  } catch (error) {
    console.error('获取待审核任务错误:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('开始处理任务审核请求');
  try {
    const requestBody = await request.json();
    console.log('请求体:', requestBody);
    const { user_task_id, action } = requestBody;
    
    if (!user_task_id || !['approve', 'reject'].includes(action)) {
      console.log('参数错误: user_task_id=', user_task_id, 'action=', action);
      return NextResponse.json(
        { message: '缺少必要参数或参数错误' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 获取任务详细信息（包括当前状态）用于调试
      console.log('获取任务详细信息，ID:', user_task_id);
      const fullTaskInfo = await db.get('SELECT * FROM user_tasks WHERE id = ?', [user_task_id]);
      console.log('任务当前状态详情:', fullTaskInfo);
      
      // 获取任务信息
      console.log('获取任务业务信息，ID:', user_task_id);
      const taskInfo = await db.get('SELECT ut.user_id, ut.task_id, t.reward_type, t.reward_amount, t.has_limited_quota FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE ut.id = ? AND ut.needs_approval = 1 AND ut.approval_status = \'pending\'', [user_task_id]);
      
      if (!taskInfo) {
        console.log('任务不存在或已处理');
        await db.run('ROLLBACK');
        return NextResponse.json(
          { message: '任务不存在或已处理' },
          { status: 404 }
        );
      }
      
      // 更新审核状态（使用参数化查询确保安全）
      console.log(`处理${action}操作，准备更新任务状态`);
      // 审核通过时同时更新status为completed和approval_status为approved
      let updateQuery, updateParams;
      if (action === 'approve') {
        updateQuery = 'UPDATE user_tasks SET status = ?, approval_status = ? WHERE id = ?';
        updateParams = ['completed', 'approved', user_task_id];
      } else {
        updateQuery = 'UPDATE user_tasks SET approval_status = ? WHERE id = ?';
        updateParams = ['rejected', user_task_id];
      }
      console.log('执行SQL:', updateQuery, '参数:', updateParams);
      
      try {
        await db.run(updateQuery, updateParams);
        console.log(`任务状态更新成功，status=${action === 'approve' ? 'completed' : '(保持不变)'}, approval_status=${action === 'approve' ? 'approved' : 'rejected'}`);
      } catch (updateError) {
        console.error('更新任务状态时发生错误:', updateError);
        throw updateError;
      }
      
      // 如果审核通过，还需要更新用户积分
      if (action === 'approve') {
        console.log('审核通过，开始处理用户奖励');
        const { user_id, reward_type, reward_amount } = taskInfo as any;
        
        // 先检查用户积分记录是否存在
        const existingPoints = await db.get('SELECT * FROM points WHERE user_id = ?', [user_id]);
        if (!existingPoints) {
          await db.run('INSERT INTO points (user_id, coins, diamonds, energy, level, streak_days, created_at, updated_at) VALUES (?, 0, 0, 0, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [user_id]);
        }
        
        // 更新积分
        if (reward_type === 'coin' || reward_type === 'coins') {
          // 应用积分倍数效果
          const finalRewardAmount = await getUserMultipliedPoints(parseInt(user_id), 'coin', reward_amount);
          
          const currentPoints = await db.get('SELECT coins FROM points WHERE user_id = ?', [user_id]);
          const newBalance = (currentPoints?.coins || 0) + finalRewardAmount;
          await db.run('UPDATE points SET coins = coins + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [finalRewardAmount, user_id]);
          
          // 记录积分变动历史
          const taskTitle = await db.get('SELECT title FROM tasks WHERE id = ?', [taskInfo.task_id]);
          await db.run(
            'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, 'coin', finalRewardAmount, newBalance, `${taskTitle?.title} - 任务审核通过奖励`, taskInfo.task_id, 'task']
          );
        } else if (reward_type === 'diamond' || reward_type === 'diamonds') {
          // 应用积分倍数效果
          const finalRewardAmount = await getUserMultipliedPoints(parseInt(user_id), 'diamond', reward_amount);
          
          const currentPoints = await db.get('SELECT diamonds FROM points WHERE user_id = ?', [user_id]);
          const newBalance = (currentPoints?.diamonds || 0) + finalRewardAmount;
          await db.run('UPDATE points SET diamonds = diamonds + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [finalRewardAmount, user_id]);
          
          // 记录积分变动历史
          const taskTitle = await db.get('SELECT title FROM tasks WHERE id = ?', [taskInfo.task_id]);
          await db.run(
            'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, 'diamond', finalRewardAmount, newBalance, `${taskTitle?.title} - 任务审核通过奖励`, taskInfo.task_id, 'task']
          );
        }
        
        // 更新连续打卡天数
        // 先获取用户的积分信息，检查是否已经在今天有连胜记录
        const pointsInfo = await db.get('SELECT streak_days, last_streak_date FROM points WHERE user_id = ?', [user_id]);
        
        // 统一使用UTC日期格式进行比较和存储，避免时区问题
          const today = new Date().toISOString().split('T')[0]; // 获取今天的日期（YYYY-MM-DD）
          const todayDateTime = new Date(); // 获取当前时间（将以UTC时间保存到数据库）
        
        // 检查最后连胜日期是否是今天
        const lastStreakDate = pointsInfo?.last_streak_date ? new Date(pointsInfo.last_streak_date).toISOString().split('T')[0] : null;
        
        if (lastStreakDate !== today) {
          // 计算最后连胜日期与今天的天数差
          let daysDiff = 0;
          if (lastStreakDate) {
            const lastDate = new Date(lastStreakDate);
            const currentDate = new Date(today);
            daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          // 存储为完整的日期时间，但确保使用相同的日期标准
          const todayDateTime = new Date(); // 获取当前时间（将以UTC时间保存到数据库）
          
          // 插入今天的连胜日期记录
          await db.run(
            'INSERT OR IGNORE INTO user_streak_dates (user_id, streak_date) VALUES (?, ?)',
            [user_id, today]
          );
          console.log(`已同步更新用户 ${user_id} 的连胜日期记录: ${today}`);
          
          // 关键修复：正确计算连续的连胜天数，考虑连胜日期之间的间隔
          // 获取所有连胜日期并按时间升序排序
          const allStreakDates = await db.all(
            'SELECT streak_date FROM user_streak_dates WHERE user_id = ? ORDER BY streak_date ASC',
            [user_id]
          );
          
          // 计算实际连续连胜天数
          let actualStreakDays = 0;
          
          if (allStreakDates.length > 0) {
            // 从最新的连胜日期开始向前计算，检查是否存在连续的连胜
            actualStreakDays = 1; // 至少有一个连胜日期（今天）
            
            // 从后往前遍历，检查连续性
            for (let i = allStreakDates.length - 1; i > 0; i--) {
              const currentDate = new Date(allStreakDates[i].streak_date);
              const prevDate = new Date(allStreakDates[i - 1].streak_date);
              
              // 计算两个日期之间的天数差
              const streakDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
              
              console.log(`检查连胜日期连续性: 当前日期=${currentDate.toISOString().split('T')[0]}, 前一日期=${prevDate.toISOString().split('T')[0]}, 间隔=${streakDiff}天`);
              
              // 如果间隔小于3天，继续累加连胜天数
              if (streakDiff < 3) {
                actualStreakDays++;
              } else {
                // 如果间隔>=3天，说明连胜被中断，只计算最近的连续连胜
                console.log(`发现连胜中断: 间隔${streakDiff}天 >= 3天，停止计算`);
                break;
              }
            }
            
            console.log(`用户${user_id}的实际连续连胜天数: ${actualStreakDays}`);
          }
          
          // 更新points表，使用正确计算的连续连胜天数
          await db.run(
            'UPDATE points SET streak_days = ?, consecutive_missed_days = 0, last_streak_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
            [actualStreakDays, todayDateTime.toISOString(), user_id]
          );
          
          // 检查今天是否有日期连胜奖励
          const currentDate = new Date();
          const month = currentDate.getMonth() + 1; // JavaScript月份从0开始
          const day = currentDate.getDate();
          
          const dateReward = await db.get(
            'SELECT * FROM date_rewards WHERE month = ? AND day = ? AND is_active = 1', 
            [month, day]
          );
          
          // 如果有奖励，记录到用户奖励通知表中
          if (dateReward) {
            // 检查是否已经通知过
            const existingNotification = await db.get(
              'SELECT * FROM user_reward_notifications WHERE user_id = ? AND date_reward_id = ? AND is_read = 0',
              [user_id, dateReward.id]
            );
            
            if (!existingNotification) {
              await db.run(
                'INSERT INTO user_reward_notifications (user_id, date_reward_id, reward_type, reward_amount, product_id, notification_date) VALUES (?, ?, ?, ?, ?, ?)',
                [user_id, dateReward.id, dateReward.reward_type, dateReward.reward_amount, dateReward.product_id, todayDateTime.toISOString()]
              );
              console.log(`为用户 ${user_id} 添加了日期奖励通知，日期: ${today}`);
            }
          }
          
          // 如果实际连胜天数小于总记录数，说明连胜被中断，只保留相关的连胜日期记录
          if (actualStreakDays < allStreakDates.length) {
            const endIndex = allStreakDates.length - actualStreakDays;
            const datesToKeep = allStreakDates.slice(endIndex).map((date: { streak_date: string }) => date.streak_date);
            
            // 删除不在保留列表中的连胜日期记录
            console.log(`删除中断前的连胜日期记录，保留${datesToKeep.length}条连续连胜记录`);
            await db.run(
              `DELETE FROM user_streak_dates WHERE user_id = ? AND streak_date NOT IN (${datesToKeep.map(() => '?').join(',')})`,
              [user_id, ...datesToKeep]
            );
          }
        } else {
          // 如果今天已经有连胜记录，则不做任何操作（避免重复增加）
          console.log(`用户 ${user_id} 今天已经有连胜记录，不重复增加连胜天数`);
        }
        
        // 增加1个能量奖励，并应用倍数效果
        const baseEnergyReward = 1;
        const finalEnergyReward = await getUserMultipliedPoints(parseInt(user_id), 'energy', baseEnergyReward);
        
        const currentEnergy = await db.get('SELECT energy FROM points WHERE user_id = ?', [user_id]);
        const newEnergy = (currentEnergy?.energy || 0) + finalEnergyReward;
        await db.run('UPDATE points SET energy = energy + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [finalEnergyReward, user_id]);
        
        // 记录能量奖励历史
        const taskTitle = await db.get('SELECT title FROM tasks WHERE id = ?', [taskInfo.task_id]);
        await db.run(
          'INSERT INTO point_history (user_id, point_type, change_amount, balance_after, reason, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user_id, 'energy', finalEnergyReward, newEnergy, `${taskTitle?.title} - 任务审核通过能量奖励`, taskInfo.task_id, 'task']
        );
      }
      
      // 提交事务
      await db.run('COMMIT');
      console.log(`任务审核${action}成功`);
      
      return NextResponse.json({
        message: action === 'approve' ? '任务审核通过' : '任务审核拒绝'
      });
    } catch (error) {
      console.error('事务处理错误:', error);
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('审核任务错误:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}