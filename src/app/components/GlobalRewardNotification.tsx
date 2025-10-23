'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Award, X } from 'lucide-react';

// 定义奖励通知接口
interface RewardNotification {
  reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
  reward_amount?: number;
  product_name?: string;
  product_icon?: string;
  product_description?: string;
  product_image?: string;
}

export default function GlobalRewardNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [currentReward, setCurrentReward] = useState<RewardNotification | null>(null);
  const router = useRouter();

  // 获取当前用户ID
  const getCurrentUserId = (): string | null => {
    try {
      // 从localStorage获取用户数据
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId?.toString() || user.id?.toString() || null;
      }
      // 也可以从专用的currentUserId存储获取
      const userId = localStorage.getItem('currentUserId');
      if (userId) return userId;
    } catch (error) {
      console.error('获取用户ID失败:', error);
    }
    return null;
  };

  // 定期检查新的奖励通知
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const userId = getCurrentUserId();
        
        if (!userId) {
          console.log('用户未登录，跳过奖励通知检查');
          return;
        }

        // 暂时注释掉API调用，避免404错误
        // 将在后端实现该API后取消注释
        /*
        const response = await fetch('/api/reward-notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.notifications && data.notifications.length > 0) {
            // 显示第一个奖励通知
            setCurrentReward(data.notifications[0]);
            setShowNotification(true);
          }
        }
        */
        
        // 开发环境下可以添加模拟数据测试UI
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.3) {
          // 随机显示一个测试通知
          const testNotifications: RewardNotification[] = [
            {
              reward_type: 'coins',
              reward_amount: 100
            },
            {
              reward_type: 'product',
              product_name: '神秘礼物',
              product_icon: '🎁',
              product_description: '恭喜你获得了一份神秘礼物！'
            }
          ];
          const randomIndex = Math.floor(Math.random() * testNotifications.length);
          setCurrentReward(testNotifications[randomIndex]);
          setShowNotification(true);
        }
        
      } catch (error) {
        console.error('检查奖励通知失败:', error);
      }
    };

    // 初始检查
    checkNotifications();

    // 设置定期检查的定时器（每10秒检查一次）
    const intervalId = setInterval(checkNotifications, 10000);

    // 清理定时器
    return () => clearInterval(intervalId);
  }, []);

  // 关闭通知
  const handleClose = () => {
    setShowNotification(false);
    setCurrentReward(null);
  };

  // 格式化奖励信息
  const formatRewardInfo = () => {
    if (!currentReward) return '';

    switch (currentReward.reward_type) {
      case 'coins':
        return `金币 +${currentReward.reward_amount}`;
      case 'diamonds':
        return `钻石 +${currentReward.reward_amount}`;
      case 'energy':
        return `能量 +${currentReward.reward_amount}`;
      case 'product':
        return `${currentReward.product_name || '神秘商品'}`;
      default:
        return '神秘奖励';
    }
  };

  // 获取奖励图标
  const getRewardIcon = () => {
    if (!currentReward) return '🎁';

    switch (currentReward.reward_type) {
      case 'coins':
        return '🪙';
      case 'diamonds':
        return '💎';
      case 'energy':
        return '⚡';
      case 'product':
        return currentReward.product_icon || '🎁';
      default:
        return '🎁';
    }
  };

  // 获取奖励描述
  const getRewardDescription = () => {
    if (!currentReward) return '';

    if (currentReward.reward_type === 'product' && currentReward.product_description) {
      return currentReward.product_description;
    }

    return '恭喜你在今天的连胜中获得了特别奖励！';
  };

  if (!showNotification || !currentReward) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-11/12 max-w-md relative transform transition-all duration-300">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="关闭"
        >
          <X size={24} className="text-gray-500" />
        </button>

        {/* 奖励图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-5xl">{getRewardIcon()}</span>
          </div>
        </div>

        {/* 奖励标题 */}
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
          🎉 {currentReward.reward_type === 'product' && currentReward.product_name 
              ? `恭喜获得 ${currentReward.product_name}` 
              : '恭喜获得奖励'}
        </h2>

        {/* 奖励内容 */}
        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-purple-600 mb-2">
            {formatRewardInfo()}
          </p>
          <p className="text-gray-600 mb-4">{getRewardDescription()}</p>
          
          {/* 如果是商品奖励，显示商品图片 */}
          {currentReward?.reward_type === 'product' && (
            <div className="mt-4 flex flex-col items-center">
              {currentReward?.product_image && (
                <img 
                  src={currentReward.product_image} 
                  alt={currentReward.product_name || '商品图片'} 
                  className="w-40 h-40 object-contain rounded-lg shadow-md mb-4"
                />
              )}
              <div className="bg-green-100 text-green-700 py-2 px-4 rounded-full text-sm font-medium">
                ✅ 已添加到背包
              </div>
            </div>
          )}
        </div>

        {/* 庆祝文字 */}
        <div className="text-center mb-8">
          <p className="text-lg text-gray-700">
            继续保持，你真是太棒了！
          </p>
        </div>

        {/* 确认按钮 */}
        <button
          onClick={handleClose}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-full hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          太棒了！
        </button>
      </div>
    </div>
  );
}