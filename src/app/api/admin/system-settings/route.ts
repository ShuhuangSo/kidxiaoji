import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 获取系统设置
export async function GET() {
  try {
    const db = await getDatabase();
    
    const settings = await db.all(
      'SELECT key, value, description FROM system_settings WHERE key IN (?, ?)',
      ['multiplier_effect_duration_hours', 'multiplier_effect_duration_minutes']
    );
    
    // 将设置转换为对象格式
    const settingsObject: { [key: string]: string } = {};
    settings.forEach((setting: any) => {
      settingsObject[setting.key] = setting.value;
    });
    
    // 确保返回默认值
    const hours = settingsObject['multiplier_effect_duration_hours'] || '6';
    const minutes = settingsObject['multiplier_effect_duration_minutes'] || '0';
    
    await db.close();
    
    return NextResponse.json({
      hours,
      minutes
    });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    return NextResponse.json(
      { message: '获取系统设置失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 更新系统设置
export async function PUT(req: NextRequest) {
  try {
    const { hours, minutes } = await req.json();
    
    // 验证输入
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);
    
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      return NextResponse.json(
        { message: '小时数必须在0-24之间' },
        { status: 400 }
      );
    }
    
    if (isNaN(minutesNum) || minutesNum < 0 || minutesNum > 59) {
      return NextResponse.json(
        { message: '分钟数必须在0-59之间' },
        { status: 400 }
      );
    }
    
    // 至少需要有一个时间单位大于0
    if (hoursNum === 0 && minutesNum === 0) {
      return NextResponse.json(
        { message: '持续时间必须大于0' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 更新设置
    await db.run(
      `UPDATE system_settings 
       SET value = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE key = ?`,
      [hoursNum.toString(), 'multiplier_effect_duration_hours']
    );
    
    await db.run(
      `UPDATE system_settings 
       SET value = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE key = ?`,
      [minutesNum.toString(), 'multiplier_effect_duration_minutes']
    );
    
    await db.close();
    
    return NextResponse.json({
      message: '设置更新成功',
      hours: hoursNum,
      minutes: minutesNum
    });
  } catch (error) {
    console.error('更新系统设置失败:', error);
    return NextResponse.json(
      { message: '更新系统设置失败', error: String(error) },
      { status: 500 }
    );
  }
}