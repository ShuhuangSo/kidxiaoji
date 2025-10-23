import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取用户已领取的连胜奖励记录
export async function GET(request: Request) {
  try {
    // 解析查询参数
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id') || url.searchParams.get('userId');
    
    console.log('接收到的获取奖励记录请求:', { userId });
    
    // 参数验证
    if (!userId) {
      return NextResponse.json({ error: '缺少必要参数user_id' }, { status: 400 });
    }
    
    // 获取数据库连接
    const db = await getDatabase();
    
    // 确保表存在
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_claimed_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        cycle_days INTEGER NOT NULL,
        reward_source TEXT NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, cycle_days, reward_source)
      );
    `);
    
    // 查询用户已领取的连胜奖励记录
    const claimedRewards = await db.all(
      `SELECT ucr.id, ucr.user_id, ucr.cycle_days, ucr.reward_source, ucr.claimed_at, 
              slr.reward_type, slr.reward_amount, slr.product_id
       FROM user_claimed_rewards ucr
       LEFT JOIN streak_length_rewards slr ON ucr.cycle_days = slr.cycle_days
       WHERE ucr.user_id = ?
       ORDER BY ucr.claimed_at DESC`,
      [userId]
    );
    
    // 获取用户的当前连胜天数
    const userStreak = await db.get(
      'SELECT streak_days FROM points WHERE user_id = ?',
      [userId]
    );
    
    // 获取所有可领取的奖励配置
    const allRewards = await db.all(
      'SELECT * FROM streak_length_rewards ORDER BY cycle_days ASC'
    );
    
    // 计算用户可以领取但尚未领取的奖励
    const availableRewards = [];
    const currentStreakDays = Number(userStreak?.streak_days || 0);
    
    console.log('计算可领取奖励 - 当前连胜天数:', currentStreakDays);
    
    for (const reward of allRewards) {
      const rewardCycleDays = Number(reward.cycle_days || 0);
      
      // 检查用户是否已领取该奖励，需要同时比较cycle_days和reward_source
      const isClaimed = claimedRewards.some(
        (claimed: any) => Number(claimed.cycle_days) === rewardCycleDays && 
                 claimed.reward_source === 'streak'
      );
      
      // 记录比较过程用于调试
      console.log(`检查奖励 ${rewardCycleDays}天: 连胜天数(${currentStreakDays}) >= 奖励天数(${rewardCycleDays})? ${currentStreakDays >= rewardCycleDays}, 已领取? ${isClaimed}`);
      
      // 如果用户连胜天数达到要求且尚未领取，则加入可领取列表
      // 确保进行正确的数字类型比较
      if (currentStreakDays >= rewardCycleDays && !isClaimed) {
        console.log(`添加可领取奖励: ${rewardCycleDays}天`);
        availableRewards.push(reward);
      }
    }
    
    console.log('最终可领取奖励数量:', availableRewards.length);
    
    return NextResponse.json({
      success: true,
      data: {
        claimed_rewards: claimedRewards,
        available_rewards: availableRewards,
        current_streak_days: currentStreakDays
      }
    });
  } catch (error) {
    console.error('获取已领取奖励记录失败:', error);
    return NextResponse.json({ error: '获取已领取奖励记录失败' }, { status: 500 });
  }
}