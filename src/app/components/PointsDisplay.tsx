'use client';

import React, { useState, useEffect } from 'react';
import { CartIcon, DiamondIcon, BatteryIcon } from '@/components/icons';

interface UserPoints {
  coins: number;
  diamonds: number;
  energy: number;
}

interface PointsDisplayProps {
  points?: UserPoints | null;
  onEnergyClick?: () => void;
}

interface MultiplierData {
  coin?: number;
  diamond?: number;
  energy?: number;
}

const PointsDisplay: React.FC<PointsDisplayProps> = ({ points, onEnergyClick }) => {
  // 内部状态，用于存储最新的积分数据
  const [currentPoints, setCurrentPoints] = useState<UserPoints>({
    coins: 0,
    diamonds: 0,
    energy: 0
  });
  
  // 存储积分倍数数据
  const [multipliers, setMultipliers] = useState<MultiplierData>({});
  
  // 能量等级弹窗状态
  const [energyLevelModalShow, setEnergyLevelModalShow] = useState(false);
  
  // 从localStorage和API获取最新积分数据
  const fetchLatestPoints = async () => {
    try {
      // 先从localStorage读取用户ID
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      if (!user.userId) return;
      
      // 从API获取最新用户数据
      const response = await fetch(`/api/user/${user.userId}`);
      if (response.ok) {
        const latestData = await response.json();
        if (latestData?.points) {
          // 更新内部状态
          setCurrentPoints({
            coins: latestData.points.coins || 0,
            diamonds: latestData.points.diamonds || 0,
            energy: latestData.points.energy || 0
          });
          
          // 同时更新localStorage
          const updatedUser = {
            ...user,
            points: latestData.points
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('获取最新积分数据失败:', error);
    }
  };
  
  // 获取用户活跃的积分倍数
  const fetchActiveMultipliers = async () => {
    try {
      // 从localStorage读取用户ID
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const userId = user.userId;
      if (!userId) return;
      
      // 从API获取用户活跃的特殊效果
      const response = await fetch(`/api/user/${userId}/active-multipliers`);
      if (response.ok) {
        const data = await response.json();
        // 确保同时支持coin和coins格式的金币倍数
        const normalizedMultipliers = {
          ...data,
          coin: data.coin || data.coins,  // 优先使用coin，如果没有则使用coins
          diamond: data.diamond || data.diamonds,  // 同样处理diamond格式
        };
        setMultipliers(normalizedMultipliers);
        console.log('规范化后的倍数数据:', normalizedMultipliers);
      }
    } catch (error) {
      console.error('获取积分倍数失败:', error);
    }
  };
  
  // 在组件挂载时获取最新数据
  useEffect(() => {
    fetchLatestPoints();
    fetchActiveMultipliers();
    
    // 设置定时器，每分钟刷新一次倍数数据
    const interval = setInterval(() => {
      fetchActiveMultipliers();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // 当props中的points变化时也更新内部状态
  useEffect(() => {
    if (points) {
      setCurrentPoints(points);
    }
  }, [points]);
  
  // 安全获取积分值，提供默认值0
  const safePoints = currentPoints || { coins: 0, diamonds: 0, energy: 0 };
  
  // 处理能量点击事件
  const handleEnergyClick = () => {
    // 点击能量时也获取最新数据，确保显示最新的积分
    fetchLatestPoints();
    fetchActiveMultipliers();
    
    if (onEnergyClick) {
      // 如果提供了自定义处理函数，则使用它
      onEnergyClick();
    } else {
      // 显示美化的能量等级弹窗
      setEnergyLevelModalShow(true);
    }
  };
  
  // 获取当前能量对应的等级名称（与首页保持一致）
  const getCurrentEnergyLevelName = (energy: number) => {
    if (energy <= 29) return '鸡蛋';
    if (energy <= 69) return '鸡宝宝';
    if (energy <= 149) return '青铜鸡';
    if (energy <= 249) return '铁公鸡';
    if (energy <= 499) return '钻石鸡';
    if (energy <= 999) return '白金鸡';
    if (energy <= 1999) return '王者鸡';
    return '霸道鸡';
  };
  
  // 获取当前能量等级对应的样式类（与首页保持一致）
  const getCurrentEnergyLevelStyles = (energy: number) => {
    if (energy <= 29) return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
    if (energy <= 69) return 'bg-green-50 border border-green-200 text-green-800';
    if (energy <= 149) return 'bg-orange-50 border border-orange-200 text-orange-800';
    if (energy <= 249) return 'bg-gray-50 border border-gray-200 text-gray-800';
    if (energy <= 499) return 'bg-blue-50 border border-blue-200 text-blue-800';
    if (energy <= 999) return 'bg-purple-50 border border-purple-200 text-purple-800';
    if (energy <= 1999) return 'bg-red-50 border border-red-200 text-red-800';
    return 'bg-indigo-50 border border-indigo-200 text-indigo-800';
  };
  
  // 渲染倍数徽章
  const renderMultiplierBadge = (multiplier: number | undefined) => {
    if (!multiplier || multiplier <= 1) return null;
    
    return (
      <span className="inline-flex items-center justify-center h-5 px-2 ml-1 text-xs font-bold bg-purple-600 text-white rounded-full animate-pulse">
        X{multiplier}
      </span>
    );
  };
  
  return (
    <>
      <div className="flex items-center space-x-3 sm:space-x-6">
        {/* 金币显示 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-1">
            <CartIcon className="text-yellow-500" size={16} />
            <span className="font-bold text-base sm:text-lg text-gray-900">{safePoints.coins || 0}</span>
            {renderMultiplierBadge(multipliers.coin)}
          </div>
          <span className="text-xs text-yellow-700 font-medium">金币</span>
        </div>
        
        {/* 钻石显示 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-1">
            <DiamondIcon className="text-blue-500" size={16} />
            <span className="font-bold text-base sm:text-lg text-gray-900">{safePoints.diamonds || 0}</span>
            {renderMultiplierBadge(multipliers.diamond)}
          </div>
          <span className="text-xs text-blue-700 font-medium">钻石</span>
        </div>
        
        {/* 能量显示 */}
        <div 
          className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
          onClick={handleEnergyClick}
        >
          <div className="flex items-center space-x-1">
            <BatteryIcon className="text-green-500" size={16} />
            <span className="font-bold text-base sm:text-lg text-gray-900">{safePoints.energy || 0}</span>
            {renderMultiplierBadge(multipliers.energy)}
          </div>
          <span className="text-xs text-green-700 font-medium">能量</span>
        </div>
      </div>
      
      {/* 美化的能量等级弹窗（与首页完全一致） */}
      {energyLevelModalShow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all animate-fade-in">
            {/* 弹窗标题 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">能量等级对应关系</h3>
            </div>
            
            {/* 弹窗内容 - 与首页完全一致的等级体系和样式 */}
            <div className="px-6 py-5">
              <div className="mb-4 text-sm text-gray-600">
                您当前能量值: <span className="font-bold text-green-600">{safePoints.energy}</span>，等级: <span className="font-bold text-green-600">{getCurrentEnergyLevelName(safePoints.energy)}</span>
              </div>
              <div className="space-y-4">
                <div className={`p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex justify-between items-center ${safePoints.energy >= 0 && safePoints.energy <= 29 ? 'ring-2 ring-yellow-400 shadow-md' : ''}`}>
                  <span className="font-medium text-yellow-800">鸡蛋</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">0-29</span>
                    {safePoints.energy >= 0 && safePoints.energy <= 29 && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-green-50 rounded-lg border border-green-200 flex justify-between items-center ${safePoints.energy >= 30 && safePoints.energy <= 69 ? 'ring-2 ring-green-400 shadow-md' : ''}`}>
                  <span className="font-medium text-green-800">鸡宝宝</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">30-69</span>
                    {safePoints.energy >= 30 && safePoints.energy <= 69 && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-orange-50 rounded-lg border border-orange-200 flex justify-between items-center ${safePoints.energy >= 70 && safePoints.energy <= 149 ? 'ring-2 ring-orange-400 shadow-md' : ''}`}>
                  <span className="font-medium text-orange-800">青铜鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">70-149</span>
                    {safePoints.energy >= 70 && safePoints.energy <= 149 && (
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center ${safePoints.energy >= 150 && safePoints.energy <= 249 ? 'ring-2 ring-gray-400 shadow-md' : ''}`}>
                  <span className="font-medium text-gray-800">铁公鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">150-249</span>
                    {safePoints.energy >= 150 && safePoints.energy <= 249 && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center ${safePoints.energy >= 250 && safePoints.energy <= 499 ? 'ring-2 ring-blue-400 shadow-md' : ''}`}>
                  <span className="font-medium text-blue-800">钻石鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">250-499</span>
                    {safePoints.energy >= 250 && safePoints.energy <= 499 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center ${safePoints.energy >= 500 && safePoints.energy <= 999 ? 'ring-2 ring-purple-400 shadow-md' : ''}`}>
                  <span className="font-medium text-purple-800">白金鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">500-999</span>
                    {safePoints.energy >= 500 && safePoints.energy <= 999 && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-red-50 rounded-lg border border-red-200 flex justify-between items-center ${safePoints.energy >= 1000 && safePoints.energy <= 1999 ? 'ring-2 ring-red-400 shadow-md' : ''}`}>
                  <span className="font-medium text-red-800">王者鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">1000-1999</span>
                    {safePoints.energy >= 1000 && safePoints.energy <= 1999 && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex justify-between items-center ${safePoints.energy >= 2000 ? 'ring-2 ring-indigo-400 shadow-md' : ''}`}>
                  <span className="font-medium text-indigo-800">霸道鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">2000+</span>
                    {safePoints.energy >= 2000 && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 弹窗底部 */}
            <div className="px-6 py-4 bg-gray-50 flex justify-center">
              <button
                onClick={() => setEnergyLevelModalShow(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded px-6 py-2"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PointsDisplay;