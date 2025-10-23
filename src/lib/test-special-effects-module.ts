// 测试special-effects模块的核心功能
import { getUserActivePointMultiplier, getUserAllActiveMultipliers, applyPointMultiplier, PointType } from './special-effects';

async function testSpecialEffectsModule() {
  try {
    console.log('=== 测试special-effects模块 ===');
    
    // 测试用户ID
    const testUserId = 1;
    
    // 1. 测试getUserActivePointMultiplier函数
    console.log('\n1. 测试getUserActivePointMultiplier函数:');
    
    // 测试金币倍数
    const coinMultiplier = await getUserActivePointMultiplier(testUserId, 'coin' as PointType);
    console.log(`金币倍数: ${coinMultiplier}`);
    
    // 测试钻石倍数
    const diamondMultiplier = await getUserActivePointMultiplier(testUserId, 'diamond' as PointType);
    console.log(`钻石倍数: ${diamondMultiplier}`);
    
    // 测试能量倍数
    const energyMultiplier = await getUserActivePointMultiplier(testUserId, 'energy' as PointType);
    console.log(`能量倍数: ${energyMultiplier}`);
    
    // 2. 测试getUserAllActiveMultipliers函数
    console.log('\n2. 测试getUserAllActiveMultipliers函数:');
    const allMultipliers = await getUserAllActiveMultipliers(testUserId);
    console.log('所有活跃倍数:', JSON.stringify(allMultipliers, null, 2));
    
    // 3. 测试applyPointMultiplier函数
    console.log('\n3. 测试applyPointMultiplier函数:');
    
    // 使用实际获取的金币倍数测试
    const baseCoins = 100;
    const multipliedCoins = applyPointMultiplier(baseCoins, coinMultiplier);
    console.log(`基础金币: ${baseCoins}, 应用倍数(${coinMultiplier})后: ${multipliedCoins}`);
    
    // 测试不同倍数情况
    console.log(`基础金币: ${baseCoins}, 应用倍数(1.5)后: ${applyPointMultiplier(baseCoins, 1.5)}`);
    console.log(`基础金币: ${baseCoins}, 应用倍数(2)后: ${applyPointMultiplier(baseCoins, 2)}`);
    console.log(`基础金币: ${baseCoins}, 应用倍数(3)后: ${applyPointMultiplier(baseCoins, 3)}`);
    
    console.log('\n=== special-effects模块测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 执行测试
testSpecialEffectsModule();