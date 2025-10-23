import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // 获取数据库连接
    const db = await getDatabase();
    
    // 查找用户
    const user = await db.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }
    
    // 支持明文密码和bcrypt哈希密码两种形式
    let passwordMatch;
    if (user.password_hash.length < 60) {
      // 如果密码长度小于60，很可能是明文密码（bcrypt哈希通常为60字符左右）
      passwordMatch = password === user.password_hash;
    } else {
      // 否则尝试使用bcrypt验证
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    }
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }
    
    // 获取用户积分信息，包括完整的连胜相关字段
    const points = await db.get(
      'SELECT coins, diamonds, energy, level, streak_days, last_streak_date, consecutive_missed_days FROM points WHERE user_id = ?',
      [user.id]
    );
    
    // 计算今天是否已经连胜
    const today = new Date().toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
    const isStreakToday = points?.last_streak_date === today;
    
    // 返回的数据格式与前端期望一致
    return NextResponse.json({
      username: user.username,
      userId: user.id, // 注意这里使用userId而不是id
      role: user.role,
      points: {
        coins: points?.coins || 0,
        diamonds: points?.diamonds || 0,
        energy: points?.energy || 0,
        level: points?.level || 1,
        streak_days: points?.streak_days || 0,
        last_streak_date: points?.last_streak_date,
        consecutive_missed_days: points?.consecutive_missed_days || 0,
        is_streak_today: isStreakToday
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}