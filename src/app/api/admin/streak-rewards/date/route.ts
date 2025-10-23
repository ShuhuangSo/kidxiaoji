import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取所有日期连胜奖励
export async function GET(request: NextRequest) {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    // 获取查询参数
    const userId = request.nextUrl.searchParams.get('user_id');
    
    let query = `
      SELECT dr.id, dr.date, dr.reward_type, dr.reward_amount, dr.product_id,
             r.name as product_name
      FROM date_streak_rewards dr
      LEFT JOIN rewards r ON dr.product_id = r.id
    `;
    
    let params: any[] = [];
    
    if (userId) {
      // 如果提供了用户ID，可以进一步扩展查询
      // 这里仅作为示例，实际逻辑可能需要根据需求调整
    }
    
    // 使用await db.all来执行查询
    const rewards = await db.all(query, params) as any[];
    
    return NextResponse.json({
      success: true,
      rewards
    });
  } catch (error) {
    console.error('获取日期连胜奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '获取日期连胜奖励失败' },
      { status: 500 }
    );
  }
}

// 添加新的日期连胜奖励
export async function POST(request: NextRequest) {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    const data = await request.json();
    const { date, reward_type, reward_amount, product_id } = data;
    
    // 验证必要字段
    if (!date || !reward_type) {
      return NextResponse.json(
        { success: false, message: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    // 根据奖励类型验证数量或产品ID
    if (reward_type !== 'product' && (!reward_amount || reward_amount <= 0)) {
      return NextResponse.json(
        { success: false, message: '请设置有效的奖励数量' },
        { status: 400 }
      );
    }
    
    if (reward_type === 'product' && !product_id) {
      return NextResponse.json(
        { success: false, message: '请选择产品' },
        { status: 400 }
      );
    }
    
    // 检查是否已存在该日期的奖励，使用await db.get
    const existingReward = await db.get('SELECT id FROM date_streak_rewards WHERE date = ?', [date]);
    if (existingReward) {
      return NextResponse.json(
        { success: false, message: '该日期已存在奖励设置' },
        { status: 400 }
      );
    }
    
    // 插入新的日期连胜奖励，使用await db.run
    const result = await db.run(
      `INSERT INTO date_streak_rewards (date, reward_type, reward_amount, product_id)
       VALUES (?, ?, ?, ?)`,
      [date, reward_type, reward_amount || null, product_id || null]
    );
    
    return NextResponse.json({
      success: true,
      message: '日期连胜奖励添加成功',
      id: result.lastID
    });
  } catch (error) {
    console.error('添加日期连胜奖励失败:', error);
    return NextResponse.json(
      { success: false, message: '添加日期连胜奖励失败' },
      { status: 500 }
    );
  }
}

// 创建数据库表的函数（内部使用）
async function createDateStreakRewardsTable() {
  try {
    // 获取已初始化的数据库实例
    const db = await getDatabase();
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS date_streak_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        reward_type TEXT NOT NULL,
        reward_amount INTEGER,
        product_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES rewards(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_date_streak_rewards_date ON date_streak_rewards(date);
    `);
    
    console.log('date_streak_rewards 表创建成功');
  } catch (error) {
    console.error('创建 date_streak_rewards 表失败:', error);
  }
}