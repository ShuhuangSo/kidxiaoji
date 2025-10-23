import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 定义奖励通知接口
export interface RewardNotification {
  id: number;
  reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
  reward_amount?: number;
  product_id?: number | string;
  product_name?: string;
  product_icon?: string;
  product_description?: string;
  product_image?: string;
  notification_date?: string;
  is_read?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // 从请求头中获取用户ID
    const userIdStr = request.headers.get('x-user-id');
    
    if (!userIdStr) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const user_id = parseInt(userIdStr, 10);
    if (isNaN(user_id)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    const database = await getDatabase();
    
    // 获取用户未读的奖励通知，使用正确的排序字段
    const notifications = await database.all(
      `SELECT 
        n.id,
        n.reward_type,
        n.reward_amount,
        n.product_id,
        r.name as product_name,
        r.description as product_description,
        r.icon as product_icon,
        r.image as product_image,
        n.notification_date
       FROM user_reward_notifications n
       LEFT JOIN rewards r ON n.product_id = r.id
       WHERE n.user_id = ? AND n.is_read = 0
       ORDER BY n.notification_date DESC`, // 修正排序字段为notification_date
      [user_id]
    ) as RewardNotification[];

    // 如果没有未读通知，尝试获取最近的通知（包括已读）
    let finalNotifications = notifications;
    if (finalNotifications.length === 0) {
      finalNotifications = await database.all(
        `SELECT 
          n.id,
          n.reward_type,
          n.reward_amount,
          n.product_id,
          r.name as product_name,
          r.description as product_description,
          r.icon as product_icon,
          r.image as product_image,
          n.notification_date
         FROM user_reward_notifications n
         LEFT JOIN rewards r ON n.product_id = r.id
         WHERE n.user_id = ?
         ORDER BY n.notification_date DESC
         LIMIT 5`,
        [user_id]
      ) as RewardNotification[];
    }

    // 将未读通知标记为已读
    if (notifications.length > 0) {
      try {
        await database.run(
          'UPDATE user_reward_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
          [user_id]
        );
      } catch (markReadError) {
        console.warn('标记通知为已读失败，但仍返回通知数据:', markReadError);
        // 不中断流程，继续返回通知数据
      }
    }

    return NextResponse.json({ notifications: finalNotifications }, { status: 200 });
  } catch (error) {
    console.error('获取奖励通知失败:', error);
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        error: '获取奖励通知失败',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      }, 
      { status: 500 }
    );
  }
}