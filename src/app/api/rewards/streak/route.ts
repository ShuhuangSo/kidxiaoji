// 模拟连胜奖励API处理器
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 从请求中获取用户ID
  const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('user_id');
  
  // 如果没有用户ID，返回错误
  if (!userId) {
    return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
  }
  
  // 模拟连胜奖励数据
  // 根据用户ID模拟不同的连胜情况和奖励
  // 对于任何用户ID，我们都返回有奖励的情况，以便测试
  return NextResponse.json({
    has_reward: true,
    streak_days: 5, // 模拟5天连胜
    reward_name: '5天连胜礼包',
    reward_description: '特殊奖励日取得连胜，获得100金币和5钻石！',
    reward_icon: '🎯',
    coins: 100,
    diamonds: 5
  }, { status: 200 });
}