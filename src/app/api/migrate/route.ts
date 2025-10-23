import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 正确初始化数据库连接
    const db = await initDatabase();
    
    // 检查user_tasks表是否需要添加新字段
    const result = await db.all(
      `PRAGMA table_info(user_tasks);`
    );

    const columns = result.map((row: any) => row.name);
    const needsMigration = !columns.includes('needs_approval') || !columns.includes('approval_status');

    if (needsMigration) {
      // 开始事务
      await db.run('BEGIN TRANSACTION;');

      try {
        // 添加needs_approval字段
        if (!columns.includes('needs_approval')) {
          await db.run(
            `ALTER TABLE user_tasks ADD COLUMN needs_approval BOOLEAN DEFAULT TRUE;`
          );
        }

        // 添加approval_status字段
        if (!columns.includes('approval_status')) {
          await db.run(
            `ALTER TABLE user_tasks ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';`
          );
        }

        // 提交事务
        await db.run('COMMIT;');
        
        return NextResponse.json({
          success: true,
          message: '数据库迁移成功完成！'
        });
      } catch (error) {
        // 回滚事务
        await db.run('ROLLBACK;');
        throw error;
      }
    } else {
      return NextResponse.json({
        success: true,
        message: '数据库已是最新状态，无需迁移。'
      });
    }
  } catch (error) {
    console.error('数据库迁移失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '数据库迁移失败',
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}