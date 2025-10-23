import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const userId = parseInt(params.id);
  
  try {
    // 解析请求体
    const data = await request.json();
    const { username, currentPassword, newPassword } = data;
    
    // 验证输入
    if (!username && !newPassword) {
      return NextResponse.json(
        { error: '请提供要更新的用户名或密码' },
        { status: 400 }
      );
    }
    
    // 连接数据库
    const db = await initDatabase();
    
    // 获取当前用户信息
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    // 更新用户名
    if (username && username !== user.username) {
      // 检查用户名是否已被使用
      const existingUser = await db.get('SELECT * FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (existingUser) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: '用户名已被使用' },
          { status: 400 }
        );
      }
      
      // 检查是否需要使用改名权限
      const { useChangePermission } = data;
      if (useChangePermission) {
        // 检查用户是否有有效的改名权限
        const permission = await db.get(
          'SELECT * FROM user_permissions WHERE user_id = ? AND permission_type = ? AND is_active = 1',
          [userId, 'username_change']
        );
        
        if (!permission) {
          await db.run('ROLLBACK');
          return NextResponse.json(
            { error: '您没有权限修改用户名，请先使用改名卡' },
            { status: 403 }
          );
        }
        
        // 使用权限后将其标记为已使用
        await db.run(
          'UPDATE user_permissions SET is_active = 0, used_at = CURRENT_TIMESTAMP WHERE id = ?',
          [permission.id]
        );
      }
      
      await db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
    }
    
    // 更新密码
    if (newPassword) {
      // 验证当前密码
      if (!currentPassword) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: '修改密码时需要提供当前密码' },
          { status: 400 }
        );
      }
      
      // 检查当前密码是否正确
      // 支持明文密码和bcrypt哈希密码两种形式
      let passwordMatch;
      if (user.password_hash.length < 60) {
        // 如果密码长度小于60，很可能是明文密码（bcrypt哈希通常为60字符左右）
        passwordMatch = currentPassword === user.password_hash;
      } else {
        // 否则尝试使用bcrypt验证
        passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      }
      
      if (!passwordMatch) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: '当前密码不正确' },
          { status: 401 }
        );
      }
      
      // 验证新密码长度
      if (newPassword.length < 6) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: '新密码长度至少为6位' },
          { status: 400 }
        );
      }
      
      // 生成新的密码哈希
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
    }
    
    // 提交事务
    await db.run('COMMIT');
    
    // 返回更新后的用户信息
    const updatedUser = await db.get('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    
    return NextResponse.json({
      success: true,
      message: '信息更新成功',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}