import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // 获取用户ID
    const userId = req.headers.get('x-user-id');
    
    console.log('清除领奖记录请求，用户ID:', userId);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '用户ID不能为空' },
        { status: 400 }
      );
    }
    
    // 获取数据库实例
    const database = await getDatabase();
    
    if (!database) {
      throw new Error('无法连接到数据库');
    }
    
    console.log('数据库连接成功');
    
    // 使用原始SQL语句直接删除所有相关奖励记录
    try {
      // 定义要清理的表和相应的字段
      const tablesToClean = [
        { name: 'user_claimed_rewards', condition: 'user_id = ?', description: '用户奖励领取记录' },
        { name: 'reward_history', condition: 'user_id = ?', description: '奖励历史' },
        { name: 'user_reward_notifications', condition: 'user_id = ?', description: '用户奖励通知' }
      ];
      
      // 存储每个表的清理结果
      const cleanupResults: Record<string, string> = {};
      
      // 逐个清理表
      for (const table of tablesToClean) {
        try {
          console.log(`尝试清理 ${table.description} (表: ${table.name})`);
          
          // 先检查表是否存在
          const tableExists = await database.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${table.name}'`
          );
          
          if (!tableExists) {
            console.log(`表 ${table.name} 不存在，跳过清理`);
            cleanupResults[table.name] = '表不存在';
            continue;
          }
          
          // 执行删除操作
          await database.run(
            `DELETE FROM ${table.name} WHERE ${table.condition}`,
            [userId]
          );
          
          // 检查删除后的记录数
          const remainingCount = await database.get(
            `SELECT COUNT(*) as count FROM ${table.name} WHERE ${table.condition}`,
            [userId]
          );
          
          const count = remainingCount?.count || 0;
          console.log(`清理 ${table.name} 后剩余记录数: ${count}`);
          cleanupResults[table.name] = `已成功清理，剩余 ${count} 条记录`;
        } catch (tableError: any) {
          console.error(`清理 ${table.name} 失败:`, tableError);
          cleanupResults[table.name] = `清理失败: ${tableError.message}`;
        }
      }
      
      // 构建响应详情
      const responseDetails = {
        claimedRewards: cleanupResults['user_claimed_rewards'] || '未处理',
        rewardHistory: cleanupResults['reward_history'] || '未处理',
        notifications: cleanupResults['user_reward_notifications'] || '未处理'
      };
      
      return NextResponse.json({
        success: true,
        message: `成功清除用户 ${userId} 的领奖记录`,
        details: responseDetails
      });
    } catch (error) {
      console.error('清除领奖记录失败:', error);
      
      return NextResponse.json(
        {
          success: false,
          message: '清除领奖记录失败',
          error: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('处理清除请求时发生错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器处理请求失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}