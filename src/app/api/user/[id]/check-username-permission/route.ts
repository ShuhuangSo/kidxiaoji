import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 打开数据库连接
async function getDatabase() {
  return open({
    filename: './database.db',
    driver: sqlite3.Database
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;
  
  let db = null;
  try {
    db = await getDatabase();
    
    // 查询用户是否有改名卡权限
    const permission = await db.get(
      'SELECT * FROM user_permissions WHERE user_id = ? AND permission_type = ? AND is_active = 1',
      [userId, 'username_change']
    );
    
    return NextResponse.json({
      hasPermission: !!permission
    });
  } catch (error) {
    console.error('检查用户名修改权限时出错:', error);
    return NextResponse.json(
      { error: '检查权限失败' },
      { status: 500 }
    );
  } finally {
    // 确保数据库总是会被关闭
    if (db) {
      await db.close();
    }
  }
}