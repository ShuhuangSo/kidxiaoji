import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 临时脚本：查看用户连胜数据
async function checkUserStreakData() {
  try {
    // 打开数据库连接
    const db = await open({
      filename: './database.db',
      driver: sqlite3.Database
    });
    
    console.log('开始查询用户连胜数据...');
    
    // 获取用户列表
    const users = await db.all('SELECT id, username FROM users');
    console.log('用户列表:', users);
    
    // 查找xiaoming用户的ID
    const xiaoming = users.find(u => u.username === 'xiaoming');
    if (xiaoming) {
      console.log('找到xiaoming用户，ID:', xiaoming.id);
      
      // 查询用户积分数据
      const userPoints = await db.get('SELECT * FROM points WHERE user_id = ?', [xiaoming.id]);
      console.log('xiaoming用户积分数据:', userPoints);
      
      // 查询今天和昨天完成的任务
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log('今天日期:', today);
      console.log('昨天日期:', yesterdayStr);
      
      // 查询用户完成的任务
      const completedTasks = await db.all(
        'SELECT ut.id, ut.status, ut.completed_at, ut.approval_status, t.title FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE ut.user_id = ? AND ut.status = ? ORDER BY ut.completed_at DESC LIMIT 10',
        [xiaoming.id, 'completed']
      );
      console.log('最近完成的任务:', completedTasks);
      
    } else {
      console.log('未找到xiaoming用户');
    }
    
    // 关闭数据库连接
    await db.close();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

// 执行查询
checkUserStreakData();