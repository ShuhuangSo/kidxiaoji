'use client';

import React, { useState, useEffect } from 'react';
import { CartIcon, DiamondIcon, BatteryIcon } from '@/components/icons';

interface MultiplierData {
  coin?: {
    value: number;
    expiryTime: string;
  };
  diamond?: {
    value: number;
    expiryTime: string;
  };
  energy?: {
    value: number;
    expiryTime: string;
  };
}

const MultiplierDisplay: React.FC = () => {
  const [multipliers, setMultipliers] = useState<MultiplierData>({});
  const [countdowns, setCountdowns] = useState<{
    [key: string]: { hours: number; minutes: number; seconds: number }
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  // 获取用户活跃的积分倍数
  const fetchActiveMultipliers = async () => {
    try {
      // 从localStorage读取用户ID
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setIsLoading(false);
        return;
      }
      
      const user = JSON.parse(userStr);
      const userId = user.userId;
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      // 从API获取用户活跃的特殊效果
      const response = await fetch(`/api/user/${userId}/active-multipliers`);
      if (response.ok) {
        const data = await response.json();
        // 转换数据格式，包含过期时间
        const formattedMultipliers: MultiplierData = {};
        
        // 确保正确处理所有类型的倍数，包括金币
        // 支持'coin'和'coins'两种键名格式
        const coinMultiplier = data.coin || data.coins;
        if (coinMultiplier && coinMultiplier > 1) {
          formattedMultipliers.coin = {
            value: coinMultiplier,
            expiryTime: data.coinExpiryTime || data.coinsExpiryTime || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          };
        }
        
        // 处理钻石倍数
        const diamondMultiplier = data.diamond || data.diamonds;
        if (diamondMultiplier && diamondMultiplier > 1) {
          formattedMultipliers.diamond = {
            value: diamondMultiplier,
            expiryTime: data.diamondExpiryTime || data.diamondsExpiryTime || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          };
        }
        
        // 处理能量倍数
        if (data.energy && data.energy > 1) {
          formattedMultipliers.energy = {
            value: data.energy,
            expiryTime: data.energyExpiryTime || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          };
        }
        
        console.log('处理后的倍数数据:', formattedMultipliers);
        
        setMultipliers(formattedMultipliers);
      }
    } catch (error) {
      console.error('获取积分倍数失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 计算倒计时
  const calculateCountdowns = () => {
    const now = new Date().getTime();
    const newCountdowns: typeof countdowns = {};
    
    Object.entries(multipliers).forEach(([type, data]) => {
      if (data && data.expiryTime) {
        const expiryTime = new Date(data.expiryTime).getTime();
        const timeLeft = expiryTime - now;
        
        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          newCountdowns[type] = { hours, minutes, seconds };
        }
      }
    });
    
    setCountdowns(newCountdowns);
  };

  // 在组件挂载时获取最新数据
  useEffect(() => {
    fetchActiveMultipliers();
    
    // 设置定时器，每分钟刷新一次倍数数据
    const dataInterval = setInterval(() => {
      fetchActiveMultipliers();
    }, 60000);
    
    return () => clearInterval(dataInterval);
  }, []);

  // 每秒更新倒计时
  useEffect(() => {
    if (Object.keys(multipliers).length > 0) {
      calculateCountdowns();
      const countdownInterval = setInterval(calculateCountdowns, 1000);
      
      return () => clearInterval(countdownInterval);
    }
  }, [multipliers]);

  // 渲染特定类型的倍数显示
  const renderMultiplierType = (
    type: 'coin' | 'diamond' | 'energy',
    icon: React.ReactNode,
    label: string,
    color: string
  ) => {
    const multiplier = multipliers[type];
    const countdown = countdowns[type];
    
    // 只需要检查multiplier是否存在，移除对countdown的依赖
    if (!multiplier) return null;
    
    return (
      <div 
        key={type} 
        className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${color} bg-opacity-10 border border-${color} border-opacity-30`}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full bg-${color} bg-opacity-20`}>
            {icon}
          </div>
          <div>
            <h4 className="font-medium text-gray-700">{label}翻倍</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-bold text-purple-600">X{multiplier.value}</span>
              <span className="text-sm text-gray-500">持续中</span>
            </div>
          </div>
        </div>
        {countdown && (
          <div className="text-right">
            <span className="text-sm text-gray-500 block">距离失效</span>
            <div className="flex space-x-1 mt-1 text-red-600 font-medium">
              <span>{countdown.hours.toString().padStart(2, '0')}</span>
              <span>:</span>
              <span>{countdown.minutes.toString().padStart(2, '0')}</span>
              <span>:</span>
              <span>{countdown.seconds.toString().padStart(2, '0')}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 检查是否有活跃的倍数效果
  const hasActiveMultipliers = Object.keys(multipliers).length > 0;
  
  if (isLoading) {
    return null; // 或者返回一个加载指示器
  }

  if (!hasActiveMultipliers) {
    return null; // 没有活跃的倍数效果时不显示
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-4 mb-8 border-2 border-purple-200 animate-fadeIn">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <span className="w-2 h-8 bg-purple-500 rounded-full mr-3"></span>
        叠加buff
      </h3>
      <div className="space-y-3">
        {renderMultiplierType(
          'coin', 
          <CartIcon className="text-yellow-500" size={24} />, 
          '金币', 
          'yellow-500'
        )}
        {renderMultiplierType(
          'diamond', 
          <DiamondIcon className="text-blue-500" size={24} />, 
          '钻石', 
          'blue-500'
        )}
        {renderMultiplierType(
          'energy', 
          <BatteryIcon className="text-green-500" size={24} />, 
          '能量', 
          'green-500'
        )}
      </div>
    </div>
  );
};

export default MultiplierDisplay;