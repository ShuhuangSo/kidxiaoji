import { getDatabase } from './db';

/**
 * 获取系统设置项
 * @param key 设置项键名
 * @param defaultValue 默认值
 * @returns 设置项的值
 */
export async function getSystemSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = await getDatabase();
  try {
    const result = await db.get(
      'SELECT value FROM system_settings WHERE key = ?',
      [key]
    );
    
    return (result as any)?.value || defaultValue;
  } catch (error) {
    console.error(`获取系统设置 ${key} 失败:`, error);
    return defaultValue;
  } finally {
    await db.close();
  }
}

/**
 * 更新系统设置项
 * @param key 设置项键名
 * @param value 设置项的值
 */
export async function updateSystemSetting(key: string, value: string): Promise<boolean> {
  const db = await getDatabase();
  try {
    await db.run(
      'UPDATE system_settings SET value = ? WHERE key = ?',
      [value, key]
    );
    
    return true;
  } catch (error) {
    console.error(`更新系统设置 ${key} 失败:`, error);
    return false;
  } finally {
    await db.close();
  }
}

/**
 * 获取积分翻倍效果的持续时间（小时）
 * @returns 持续时间（小时，包含分钟转换）
 */
export async function getMultiplierEffectDurationHours(): Promise<number> {
  const db = await getDatabase();
  try {
    // 从系统设置表获取配置
    const hoursResult = await db.get(
      'SELECT value FROM system_settings WHERE key = ?',
      ['multiplier_effect_duration_hours']
    );
    
    const minutesResult = await db.get(
      'SELECT value FROM system_settings WHERE key = ?',
      ['multiplier_effect_duration_minutes']
    );
    
    // 转换为数字并计算总小时数
    const hours = parseInt((hoursResult as any)?.value || '6');
    const minutes = parseInt((minutesResult as any)?.value || '0');
    
    // 计算总小时数（包含分钟转换）
    const totalHours = hours + (minutes / 60);
    
    return totalHours;
  } catch (error) {
    console.error('获取积分翻倍效果持续时间失败:', error);
    // 出错时返回默认值6小时
    return 6;
  } finally {
    // 确保数据库连接关闭
    await db.close();
  }
}

/**
 * 获取积分翻倍效果的完整持续时间信息
 * @returns 包含小时和分钟的对象
 */
export async function getMultiplierEffectDuration(): Promise<{hours: number, minutes: number}> {
  const db = await getDatabase();
  try {
    // 从系统设置表获取配置
    const hoursResult = await db.get(
      'SELECT value FROM system_settings WHERE key = ?',
      ['multiplier_effect_duration_hours']
    );
    
    const minutesResult = await db.get(
      'SELECT value FROM system_settings WHERE key = ?',
      ['multiplier_effect_duration_minutes']
    );
    
    // 转换为数字
    const hours = parseInt((hoursResult as any)?.value || '6');
    const minutes = parseInt((minutesResult as any)?.value || '0');
    
    return { hours, minutes };
  } catch (error) {
    console.error('获取积分翻倍效果持续时间失败:', error);
    // 出错时返回默认值6小时0分钟
    return { hours: 6, minutes: 0 };
  } finally {
    // 确保数据库连接关闭
    await db.close();
  }
}