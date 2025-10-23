import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    // 验证用户ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
    }
    
    // 获取数据库连接
    const db = await getDatabase();
    
    // 检查用户是否存在
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 检查用户是否有有效的头像修改权限
    const permission = await db.get(
      'SELECT * FROM user_permissions WHERE user_id = ? AND permission_type = ? AND is_active = 1',
      [userId, 'avatar_change']
    );
    
    if (!permission) {
      return NextResponse.json(
        { message: '您没有权限修改头像，请先使用改头像卡' },
        { status: 403 }
      );
    }
    
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null; // 保持与前端一致的字段名
    
    if (!file) {
      return NextResponse.json({ message: '未提供头像文件' }, { status: 400 });
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: '仅支持 JPG、PNG 和 WebP 格式的图片' }, { status: 400 });
    }
    
    // 验证文件大小 (5MB 限制)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ message: '图片大小不能超过 5MB' }, { status: 400 });
    }
    
    // 确保头像目录存在
    const avatarDir = join(process.cwd(), 'public', 'avatars');
    if (!existsSync(avatarDir)) {
      mkdirSync(avatarDir, { recursive: true });
    }
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const filename = `${userId}_${timestamp}.${extension}`;
    const filePath = join(avatarDir, filename);
    
    // 读取文件内容并保存 - 避免Buffer类型错误
    const arrayBuffer = await file.arrayBuffer();
    // 直接使用Uint8Array写入文件，不需要中间的Buffer转换
    const fileData = new Uint8Array(arrayBuffer);
    
    // 使用fs.writeFileSync写入Uint8Array数据
    writeFileSync(filePath, fileData);
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 保存头像路径到数据库
      // 首先检查users表是否有avatar字段，如果没有则添加
      try {
        // 先尝试更新头像
        await db.run('UPDATE users SET avatar = ? WHERE id = ?', [filename, userId]);
      } catch (error) {
        console.error('直接更新头像失败，尝试检查并添加avatar字段:', error);
        // 检查表结构，看是否有avatar字段
        const tableInfo = await db.all(`PRAGMA table_info(users)`);
        const hasAvatarColumn = tableInfo.some((col: any) => col.name === 'avatar');
        
        if (!hasAvatarColumn) {
          // 如果没有avatar字段，添加该字段
          await db.run('ALTER TABLE users ADD COLUMN avatar TEXT');
          console.log('成功添加avatar字段');
        }
        
        // 再次尝试更新头像
        await db.run('UPDATE users SET avatar = ? WHERE id = ?', [filename, userId]);
      }
      
      // 使用权限后将其标记为已使用
      await db.run(
        'UPDATE user_permissions SET is_active = 0, used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [permission.id]
      );
      
      await db.run('COMMIT');
      
      // 返回成功响应
      return NextResponse.json({
        message: '头像上传成功',
        avatarUrl: `/avatars/${filename}`
      }, { status: 200 });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('事务处理失败:', error);
      return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('头像上传失败:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    // 验证用户ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 });
    }
    
    // 获取数据库连接
    const db = await getDatabase();
    
    // 查询用户头像
    const user = await db.get('SELECT avatar FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }
    
    // 如果有头像，返回头像文件
    if (user.avatar) {
      const avatarPath = join(process.cwd(), 'public', 'avatars', user.avatar);
      if (existsSync(avatarPath)) {
        // 避免使用Buffer，直接使用fs.readFileSync并转换为ArrayBuffer
        const data = readFileSync(avatarPath);
        
        // 创建正确的ArrayBuffer
        const arrayBuffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(arrayBuffer);
        
        // 手动复制数据，避免Buffer类型问题
        for (let i = 0; i < data.length; i++) {
          view[i] = data[i];
        }
        
        // 获取文件类型
        const extension = user.avatar.split('.').pop()?.toLowerCase();
        let mimeType = 'application/octet-stream';
        if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
        if (extension === 'png') mimeType = 'image/png';
        if (extension === 'webp') mimeType = 'image/webp';
        
        // 使用ArrayBuffer创建Response，确保类型兼容
        return new Response(arrayBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(arrayBuffer.byteLength),
          },
        });
      }
    }
    
    // 如果没有头像，返回404
    return NextResponse.json({ message: '头像不存在' }, { status: 404 });
    
  } catch (error) {
    console.error('获取头像失败:', error);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}