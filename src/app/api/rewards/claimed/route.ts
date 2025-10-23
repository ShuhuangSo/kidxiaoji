import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 处理GET请求，检查用户是否已经领取过特定日期和类型的奖励
export async function GET(request: Request) {
  try {
    // 从请求URL中获取查询参数
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const rewardDate = url.searchParams.get('reward_date');
    const rewardType = url.searchParams.get('reward_type') || 'all'; // 新增奖励类型参数，默认为'all'
    
    console.log('检查奖励领取状态请求:', { userId, rewardDate, rewardType });
    
    // 验证必要的参数
    if (!userId || !rewardDate) {
      return NextResponse.json({
        success: false,
        message: '缺少必要的参数'
      }, { status: 400 });
    }
    
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    try {
      // 先检查表结构，确保表存在且有必要的字段
      const tableInfo = await db.all(
        'PRAGMA table_info(user_claimed_rewards)'
      );
      
      const hasRewardDateField = tableInfo.some((column: any) => column.name === 'reward_date');
      const hasRewardTypeField = tableInfo.some((column: any) => column.name === 'reward_type');
      
      if (!hasRewardDateField) {
        console.log('表user_claimed_rewards没有reward_date字段，使用替代查询');
        // 如果没有reward_date字段，返回未领取状态
        return NextResponse.json({
          success: true,
          claimed: false
        });
      }
      
      // 根据是否有reward_type字段来构建不同的查询
      let query: string;
      let params: any[];
      
      // 特殊处理specific_date_reward类型，只查找日期奖励
      if (rewardType === 'specific_date_reward') {
        // 查询特定日期奖励，只检查reward_details中reward_source为date_reward的记录
        query = `SELECT id FROM user_claimed_rewards 
                 WHERE user_id = ? AND reward_date = ? 
                 AND reward_details LIKE '%"reward_source":"date_reward"%'`;
        params = [userId, rewardDate];
      } 
      // 特殊处理streak_goal_reward类型，只查找连胜目标奖励
      else if (rewardType === 'streak_goal_reward') {
        // 查询连胜目标奖励，只检查reward_details中reward_source为streak_goal的记录
        query = `SELECT id FROM user_claimed_rewards 
                 WHERE user_id = ? AND reward_date = ? 
                 AND reward_details LIKE '%"reward_source":"streak_goal"%'`;
        params = [userId, rewardDate];
      }
      else if (rewardType === 'all' || !hasRewardTypeField) {
        // 查询用户是否已经领取过该日期的任何奖励
        query = 'SELECT id FROM user_claimed_rewards WHERE user_id = ? AND reward_date = ?';
        params = [userId, rewardDate];
      } else {
        // 查询用户是否已经领取过该日期的特定类型奖励
        query = 'SELECT id FROM user_claimed_rewards WHERE user_id = ? AND reward_date = ? AND reward_type = ?';
        params = [userId, rewardDate, rewardType];
      }
      
      const result = await db.get(query, params);
      
      console.log('奖励领取检查结果:', { claimed: result !== undefined });
      
      // 返回检查结果
      return NextResponse.json({
        success: true,
        claimed: result !== undefined // 如果有结果则表示已经领取过
      });
    } catch (error) {
      console.error('检查奖励领取状态失败:', error);
      // 即使查询失败，也安全地返回未领取状态，而不是500错误
      return NextResponse.json({
        success: true,
        claimed: false,
        warning: '无法检查奖励领取状态，假设未领取'
      });
    }
  } catch (error) {
    console.error('处理奖励领取检查请求失败:', error);
    // 最外层错误也返回未领取状态，确保前端功能正常
    return NextResponse.json({
      success: true,
      claimed: false,
      warning: '系统错误，假设奖励未领取'
    });
  }
}