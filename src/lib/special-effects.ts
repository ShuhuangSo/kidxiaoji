/**
 * 特殊效果相关功能模块
 * 支持金币、钻石、能量三种积分类型的倍数效果
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

/**
 * 积分类型，支持金币、钻石、能量三种类型
 * 金币支持单数和复数形式
 */
export type PointType = 'coin' | 'coins' | 'diamond' | 'diamonds' | 'energy';

/**
 * 活跃倍数效果接口，包含倍数和过期时间
 */
export interface MultiplierWithExpiry {
  multiplier: number;
  expiryTime: string;
}

/**
 * 活跃倍数效果集合接口
 */
export interface ActiveMultiplierWithExpiry {
  [pointType: string]: MultiplierWithExpiry;
}

/**
 * 简化的活跃倍数效果接口
 */
export interface ActiveMultiplier {
  [pointType: string]: number;
}

/**
 * 打开数据库连接
 */
async function getDatabase() {
  // 使用与db.ts中相同的数据库路径配置
  const dbPath = process.env.DATABASE_PATH || '/app/db/database.db';
  console.log(`special-effects数据库路径: ${dbPath}`);
  
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

/**
 * 获取用户当前活跃的指定类型积分倍数
 * @param userId 用户ID
 * @param pointType 积分类型（coin、diamond、energy）
 * @returns 活跃倍数，如果没有则返回1
 */
export async function getUserActivePointMultiplier(userId: number, pointType: PointType): Promise<number> {
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    // 查询指定积分类型的活跃倍数
    const result = await db.get(
      `SELECT multiplier FROM special_effects 
       WHERE user_id = ? AND point_type = ? AND start_time <= ? AND end_time >= ? 
       ORDER BY end_time DESC LIMIT 1`,
      [userId, pointType, now, now]
    );
    
    await db.close();
    
    // 如果没有活跃效果，返回1（表示不加倍）
    return result ? result.multiplier : 1;
  } catch (error) {
    console.error('获取用户活跃倍数失败:', error);
    // 出错时默认返回1
    return 1;
  }
}

/**
 * 获取用户所有类型积分的当前活跃倍数
 * @param userId 用户ID
 * @returns 各积分类型的活跃倍数
 */
export async function getUserAllActiveMultipliers(userId: number): Promise<any> {
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    // 查询所有活跃的倍数效果，包含过期时间
    const activeEffects = await db.all(
      `SELECT point_type, multiplier, end_time 
       FROM special_effects 
       WHERE user_id = ? AND start_time <= ? AND end_time >= ? 
       ORDER BY point_type`,
      [userId, now, now]
    );
    
    // 规范化point_type格式，将coins转为coin，diamonds转为diamond
    const normalizedEffects = activeEffects.map(effect => {
      let normalizedType = effect.point_type;
      if (effect.point_type === 'coins') normalizedType = 'coin';
      if (effect.point_type === 'diamonds') normalizedType = 'diamond';
      return {
        point_type: normalizedType,
        multiplier: effect.multiplier,
        end_time: effect.end_time
      };
    });
    
    await db.close();
    
    // 组织结果，同时返回简单格式和带过期时间的格式
    const result: any = {};
    const multipliers: ActiveMultiplier = {};
    
    normalizedEffects.forEach(effect => {
      multipliers[effect.point_type] = effect.multiplier;
      result[effect.point_type] = effect.multiplier;
      result[`${effect.point_type}ExpiryTime`] = effect.end_time;
    });
    
    // 添加兼容性处理
    if (result.coin) {
      result.coins = result.coin;
      result.coinsExpiryTime = result.coinExpiryTime;
    }
    if (result.diamond) {
      result.diamonds = result.diamond;
      result.diamondsExpiryTime = result.diamondExpiryTime;
    }
    
    return result;
  } catch (error) {
    console.error('获取用户所有活跃倍数失败:', error);
    // 出错时返回空对象
    return {};
  }
}

/**
 * 应用积分倍数
 * @param basePoints 基础积分数量
 * @param multiplier 倍数
 * @returns 应用倍数后的积分数量
 */
export function applyPointMultiplier(basePoints: number, multiplier: number): number {
  return Math.floor(basePoints * multiplier);
}

/**
 * 获取用户活跃倍数并应用到基础积分
 * @param userId 用户ID
 * @param pointType 积分类型
 * @param basePoints 基础积分数量
 * @returns 应用倍数后的积分数量
 */
export async function getUserMultipliedPoints(
  userId: number,
  pointType: PointType,
  basePoints: number
): Promise<number> {
  try {
    // 获取用户当前活跃的倍数
    const multiplier = await getUserActivePointMultiplier(userId, pointType);
    
    // 应用倍数并返回
    return applyPointMultiplier(basePoints, multiplier);
  } catch (error) {
    console.error(`应用${pointType}积分倍数失败:`, error);
    // 出错时返回原始积分数量
    return basePoints;
  }
}

/**
 * 记录特殊效果
 * @param userId 用户ID
 * @param effectType 效果类型
 * @param pointType 积分类型
 * @param multiplier 倍数
 * @param durationHours 持续时间（小时）
 * @param description 描述
 */
export async function recordSpecialEffect(
  userId: number,
  effectType: string,
  pointType: PointType,
  multiplier: number,
  durationHours: number,
  description: string
): Promise<void> {
  try {
    const db = await getDatabase();
    const now = new Date();
    const startTime = now.toISOString();
    
    const endTime = new Date(now);
    // 将总小时数转换为毫秒，然后设置时间
    // 这样可以正确处理包含小数部分的小时数（如2.5小时 = 2小时30分钟）
    endTime.setTime(endTime.getTime() + durationHours * 60 * 60 * 1000);
    
    await db.run(
      `INSERT INTO special_effects 
       (user_id, effect_type, point_type, multiplier, start_time, end_time, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, effectType, pointType, multiplier, startTime, endTime.toISOString(), description]
    );
    
    await db.close();
  } catch (error) {
    console.error('记录特殊效果失败:', error);
    throw new Error('记录特殊效果失败');
  }
}
