'use client'
import React, { useState, useEffect } from 'react';

interface StreakGoalProps {
  currentStreakDays: number;
  userId?: string;
}

// 适配streak_length_rewards表的数据结构
interface StreakReward {
  id: number;
  cycle_type?: string;
  cycle_days: number;
  reward_type: string;
  reward_amount?: number;
  product_id?: number;
  product_name?: string;
  product_icon?: string;
}

export const StreakGoals: React.FC<StreakGoalProps> = ({ currentStreakDays, userId }) => {
  const [rewards, setRewards] = useState<StreakReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<Set<string>>(new Set());
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [currentReward, setCurrentReward] = useState<StreakReward | null>(null);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [claimMessage, setClaimMessage] = useState('');
  const [rewardDetails, setRewardDetails] = useState<{[key: string]: any} | null>(null); // 用于存储领取到的奖励详情
  
  // 从API获取连胜周期奖励数据
  const fetchRewards = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/streak-rewards/streak');
      
      if (!response.ok) {
        throw new Error('获取连胜奖励数据失败');
      }
      
      const data: StreakReward[] = await response.json();
      
      // 确保数据格式标准化
      const normalizedRewards = data.map(reward => ({
        id: reward.id,
        cycle_type: reward.cycle_type || 'cycle',
        cycle_days: reward.cycle_days,
        reward_type: reward.reward_type,
        reward_amount: reward.reward_amount,
        product_id: reward.product_id,
        product_name: reward.product_name || '连胜奖励',
        product_icon: reward.product_icon || '🎁'
      }));      
      // 按cycle_days升序排序
      normalizedRewards.sort((a, b) => a.cycle_days - b.cycle_days);
      
      setRewards(normalizedRewards);
      setError(null);
    } catch (err) {
      setError('获取连胜奖励数据失败');
      console.error('Error fetching rewards:', err);
      
      // 错误情况下使用mock数据
      const mockRewards: StreakReward[] = [
        { id: 1, cycle_days: 3, reward_type: 'points', reward_amount: 50 },
        { id: 2, cycle_days: 7, reward_type: 'diamonds', reward_amount: 10 },
        { id: 3, cycle_days: 14, reward_type: 'product', product_id: 1, product_name: '精美勋章', product_icon: '🏅' },
        { id: 4, cycle_days: 21, reward_type: 'points', reward_amount: 300 },
        { id: 5, cycle_days: 30, reward_type: 'product', product_id: 2, product_name: '神秘礼包', product_icon: '🎁' },
      ];
      setRewards(mockRewards);
    } finally {
      setLoading(false);
    }
  };

  // 获取已领取的奖励
  const fetchClaimedRewards = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/streak-rewards/claimed?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('已领取奖励API返回:', data);
        
        // 修复：更灵活地处理API返回的数据格式
        const claimedRewardsList = data.data?.claimed_rewards || [];
        if (claimedRewardsList.length > 0) {
          const claimedSet = new Set<string>(claimedRewardsList.map((reward: any) => 
            // 修复：处理cycle_days可能是数字或字符串的情况
            String(reward.cycle_days || reward.days || '')
          ).filter(Boolean));
          setClaimedRewards(claimedSet);
          console.log('已设置的已领取奖励集合:', Array.from(claimedSet));
        }
      }
    } catch (err) {
      console.error('获取已领取奖励失败:', err);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  useEffect(() => {
    fetchClaimedRewards();
  }, [userId, currentStreakDays]);

  // 计算距离用户当前连胜天数最近的3个目标，包括已达成但未领取的
  const getNearestGoals = () => {
    if (rewards.length === 0) return [];

    // 创建所有可能的目标天数（基于周期）
    const allGoalDays: { days: number; reward: StreakReward }[] = [];
    
    rewards.forEach(reward => {
      // 对于周期型奖励，计算多个可能的目标点
      if (reward.cycle_type === 'cycle' || !reward.cycle_type) {
        for (let i = 1; i <= 5; i++) { // 最多计算前5个周期
          const goalDays = reward.cycle_days * i;
          // 添加大于当前连胜天数的目标，或者等于当前连胜天数的目标
          if (goalDays > currentStreakDays || goalDays === currentStreakDays) {
            allGoalDays.push({ days: goalDays, reward });
          }
        }
      } else {
        // 对于特定天数奖励
        if (reward.cycle_days > currentStreakDays || reward.cycle_days === currentStreakDays) {
          allGoalDays.push({ days: reward.cycle_days, reward });
        }
      }
    });

    // 按距离当前连胜天数排序，取前3个
    return allGoalDays
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
  };

  const nearestGoals = getNearestGoals();

  // 检查当前是否有可领取的奖励
  const getClaimableGoal = () => {
    if (!userId) return null;
    
    for (const reward of rewards) {
      if (reward.cycle_type === 'cycle' || !reward.cycle_type) {
        // 对于周期型奖励，检查当前连胜天数是否是奖励周期的倍数
        if (currentStreakDays % reward.cycle_days === 0 && 
            currentStreakDays > 0 && 
            !claimedRewards.has(`${reward.cycle_days}`)) {
          return { days: currentStreakDays, reward };
        }
      } else {
        // 对于特定天数奖励，检查当前连胜天数是否等于目标天数
        if (currentStreakDays === reward.cycle_days && 
            !claimedRewards.has(`${reward.cycle_days}`)) {
          return { days: reward.cycle_days, reward };
        }
      }
    }
    return null;
  };

  // 获取奖励图标
  const getRewardIcon = (reward: StreakReward) => {
    if (reward.reward_type === 'product') {
      return reward.product_icon || '🎁';
    }
    
    switch (reward.reward_type) {
      case 'points':
        return '💰';
      case 'coins':
        return '🪙';
      case 'diamonds':
        return '💎';
      case 'energy':
        return '⚡';
      default:
        return '🏆';
    }
  };

  // 获取奖励名称
  const getRewardName = (reward: StreakReward) => {
    if (reward.reward_type === 'product') {
      return reward.product_name || '神秘物品';
    } else {
      const amount = reward.reward_amount || 0;
      const unit = reward.reward_type === 'points' ? '积分' : 
                   reward.reward_type === 'coins' ? '金币' :
                   reward.reward_type === 'diamonds' ? '钻石' : '能量';
      return `${amount}${unit}`;
    }
  };

  // 获取奖励单位中文名称
  const getRewardTypeName = (type: string) => {
    switch (type) {
      case 'points':
        return '积分';
      case 'coins':
        return '金币';
      case 'diamonds':
        return '钻石';
      case 'energy':
        return '能量';
      case 'product':
        return '物品';
      default:
        return '奖励';
    }
  };

  // 领取奖励
  const claimReward = async (reward: StreakReward) => {
    if (!userId) return;
    
    setCurrentReward(reward);
    setShowRewardModal(true);
    setClaimStatus('idle');
    setClaimMessage('');
    setRewardDetails(null);
  };

  // 确认领取奖励
  const confirmClaimReward = async () => {
    if (!userId || !currentReward) return;
    
    try {
      setClaimStatus('idle');
      const response = await fetch('/api/streak-rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          user_id: userId,
          cycle_days: currentReward.cycle_days
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 保存领取到的奖励详情
        setRewardDetails(data.data || {});
        
        setClaimStatus('success');
        setClaimMessage('奖励领取成功！');
        
        // 更新已领取奖励状态
        setClaimedRewards(prev => new Set(prev).add(`${currentReward.cycle_days}`));
        
        // 延迟关闭弹窗，让用户有时间看到结果
        setTimeout(() => {
          setShowRewardModal(false);
          setCurrentReward(null);
          setRewardDetails(null);
          
          // 发送自定义事件，通知父组件或其他组件刷新数据
          window.dispatchEvent(new CustomEvent('streak-reward-claimed'));
        }, 2000);
      } else {
        setClaimStatus('error');
        // 优先显示我们添加的详细错误消息
        setClaimMessage(data.message || data.error || '领取奖励失败');
      }
    } catch (err) {
      setClaimStatus('error');
      setClaimMessage('网络错误，请稍后重试');
      console.error('领取奖励失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">连胜目标</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const claimableGoal = getClaimableGoal();

  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">连胜目标</h2>
        {nearestGoals.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {nearestGoals.map((goal, index) => {
              const daysRemaining = goal.days - currentStreakDays;
              const progress = Math.min((currentStreakDays / goal.days) * 100, 100);
              const isClaimable = goal.days === currentStreakDays && 
                                userId && 
                                !claimedRewards.has(`${goal.days}`);
              
              return (
                <div 
                  key={`${goal.reward.id}-${goal.days}`} 
                  className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 ${isClaimable ? 'bg-gradient-to-br from-orange-50 to-yellow-50 border border-yellow-200' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}
                >
                  <div className="text-center mb-2">
                    <span className="text-2xl font-bold text-orange-600">{goal.days}</span>
                    <span className="text-gray-600 ml-1">天</span>
                  </div>
                  
                  <div className="h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isClaimable ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-lg mr-1">{getRewardIcon(goal.reward)}</span>
                    <span className="text-sm font-medium text-gray-700">{getRewardName(goal.reward)}</span>
                  </div>
                  
                  {daysRemaining === 0 ? (
                    <button
                      onClick={() => claimReward(goal.reward)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 focus:outline-none"
                    >
                      领取奖励
                    </button>
                  ) : (
                    <div className="text-xs text-gray-500 text-center">
                      还差{daysRemaining}天
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            恭喜！您已达成所有连胜目标
          </div>
        )}
      </div>

      {/* 奖励领取弹窗 */}
      {showRewardModal && currentReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 transform transition-all animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">领取连胜奖励</h3>
              <p className="text-lg text-gray-600 mb-4">恭喜你达成了{currentReward.cycle_days}天连胜！</p>
              
              <div className="bg-yellow-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-center">
                  <div className="text-4xl mr-3 animate-pulse">{getRewardIcon(currentReward)}</div>
                  <div>
                    <div className="text-xl font-bold text-yellow-600">{getRewardName(currentReward)}</div>
                    <div className="text-yellow-700">连胜{currentReward.cycle_days}天奖励</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              {claimStatus === 'success' && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="font-bold mb-2">{claimMessage}</div>
                  {rewardDetails && (
                    <div className="mt-2">
                      {currentReward.reward_type === 'product' ? (
                        <div className="flex flex-col items-center justify-center mt-3">
                          <div className="text-5xl mb-2 animate-bounce">{getRewardIcon(currentReward)}</div>
                          <div className="font-bold text-lg text-green-800 mb-1">{getRewardName(currentReward)}</div>
                          <div className="text-sm">物品已添加到背包</div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          已获得 {currentReward.reward_amount}{getRewardTypeName(currentReward.reward_type)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {claimStatus === 'error' && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-center">
                  ❌ {claimMessage}
                </div>
              )}
              
              {claimStatus === 'idle' && (
                <>
                  <button
                    onClick={confirmClaimReward}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    确认领取
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRewardModal(false);
                      setCurrentReward(null);
                      setRewardDetails(null);
                    }}
                    className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    取消
                  </button>
                </>
              )}
              
              {(claimStatus === 'success' || claimStatus === 'error') && (
                <button
                  onClick={() => {
                    setShowRewardModal(false);
                    setCurrentReward(null);
                    setRewardDetails(null);
                  }}
                  className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};