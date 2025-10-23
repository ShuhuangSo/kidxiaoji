// 根据能量值获取用户等级名称
export function getLevelName(energy: number): string {
  if (energy >= 2000) return '霸道鸡';
  if (energy >= 1000) return '王者鸡';
  if (energy >= 500) return '白金鸡';
  if (energy >= 250) return '钻石鸡';
  if (energy >= 150) return '铁公鸡';
  if (energy >= 70) return '青铜鸡';
  if (energy >= 30) return '鸡宝宝';
  return '鸡蛋';
}

// 根据等级数字获取对应的等级名称
export function getLevelNameByLevel(level: number): string {
  const levelNames = {
    1: '鸡蛋',
    2: '鸡宝宝',
    3: '青铜鸡',
    4: '铁公鸡',
    5: '钻石鸡',
    6: '白金鸡',
    7: '王者鸡',
    8: '霸道鸡'
  };
  return levelNames[level as keyof typeof levelNames] || `等级${level}`;
}

// 根据等级获取对应的最低能量值
export function getMinEnergyByLevel(level: number): number {
  const levelEnergyMap = {
    1: 0,    // 鸡蛋
    2: 30,   // 鸡宝宝
    3: 70,   // 青铜鸡
    4: 150,  // 铁公鸡
    5: 250,  // 钻石鸡
    6: 500,  // 白金鸡
    7: 1000, // 王者鸡
    8: 2000  // 霸道鸡
  };
  return levelEnergyMap[level as keyof typeof levelEnergyMap] || 0;
}