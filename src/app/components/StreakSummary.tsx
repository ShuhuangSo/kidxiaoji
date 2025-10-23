import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
interface StreakSummaryProps {
  streakDays: number;
  isStreakToday?: boolean;
  userId?: string;
}

const StreakSummary: React.FC<StreakSummaryProps> = ({
  streakDays,
  isStreakToday = false,
  userId
}) => {
  const router = useRouter();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardData, setRewardData] = useState<any>(null);
  const [loading, setLoading] = useState(false); // 加载状态
  const [rewardStatus, setRewardStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasTodayReward, setHasTodayReward] = useState(false);
  const [hasCycleReward, setHasCycleReward] = useState(false);
  const [cycleRewardData, setCycleRewardData] = useState<any>(null);
  
  // 检查今天是否有奖励设置
  const checkTodayHasReward = async () => {
    if (!userId) return;
    
    try {
      // 准备请求头
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('x-user-id', userId);
      
      // 从API获取日期奖励数据
      const response = await fetch('/api/streak-rewards/date', {
        method: 'GET',
        headers: headers
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.rewards)) {
        // 获取今天的日期，格式化为YYYY-MM-DD
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // 查找今天是否有设置日期奖励
        const todayReward = data.rewards.find((reward: any) => reward.date === todayStr);
        setHasTodayReward(!!todayReward);
      }
    } catch (error) {
      console.error('检查今天奖励失败:', error);
      setHasTodayReward(false);
    }
  };
  
  // 检查周期奖励
  const checkCycleReward = async () => {
    console.log('开始检查周期奖励:', { userId, streakDays });
    
    // 首先验证必要参数
    if (!userId || !streakDays || streakDays <= 0) {
      console.log('用户ID不存在或连胜天数为0，不检查周期奖励');
      setHasCycleReward(false);
      setCycleRewardData(null);
      return;
    }

    const currentStreakDays = streakDays;
    
    console.log('周期奖励检查配置:', { currentStreakDays });
    
    try {
      // 从API获取周期奖励天数配置
      const response = await fetch('/api/streak-rewards/streak');
      if (!response.ok) {
        throw new Error('获取周期奖励配置失败');
      }
      
      const rewards: Array<{ cycle_type?: string; cycle_days: number }> = await response.json();
      
      // 提取周期类型的奖励天数
      const cycleDaysList = rewards
        .filter(reward => reward.cycle_type === 'cycle' || !reward.cycle_type)
        .map(reward => reward.cycle_days);
      
      console.log('从API获取的周期奖励天数列表:', cycleDaysList);
      
      // 检查当前连胜天数是否是任何周期奖励天数的倍数
      const currentStreakDays = streakDays;
      const isCycleDay = cycleDaysList.some(day => currentStreakDays % day === 0);
      
      if (!isCycleDay) {
        console.log(`当前连胜天数${currentStreakDays}不是任何周期奖励天数的倍数`);
        setHasCycleReward(false);
        setCycleRewardData(null);
        return;
      }

      // 创建简单的奖励数据结构
      const rewardData = {
        id: `cycle_${currentStreakDays}`,
        streak_days: currentStreakDays,
        reward_name: `${currentStreakDays} 天连胜奖励`,
        // 统一格式以便于领取API使用
        cycle_rewards: [{
          reward_id: `cycle_${currentStreakDays}`,
          reward_type: 'cycle_reward',
          reward_source: 'cycle_reward',
          reward_source_desc: `streak_${currentStreakDays}_days`
        }]
      };

      // 跳过API检查，直接设置奖励状态为可领取
      console.log(`连胜天数${currentStreakDays}是周期奖励天数的倍数，设置奖励为可领取`);
      setHasCycleReward(true);
      setCycleRewardData(rewardData);
      
    } catch (error) {
      console.error('检查周期奖励失败:', error);
      
      // 错误时使用默认的周期奖励天数列表作为后备
      // 注意：这只是临时方案，实际应该从API获取
      const cycleDaysList = [5, 11, 13];
      console.log('使用默认周期奖励天数列表作为后备:', cycleDaysList);
      const currentStreakDays = streakDays;
      const isCycleDay = cycleDaysList.some(day => currentStreakDays % day === 0);
      
      if (isCycleDay) {
        const fallbackData = {
          id: `cycle_${currentStreakDays}`,
          streak_days: currentStreakDays,
          reward_name: `${currentStreakDays} 天连胜奖励`,
          cycle_rewards: [{
            reward_id: `cycle_${currentStreakDays}`,
            reward_type: 'cycle_reward',
            reward_source: 'cycle_reward',
            reward_source_desc: `streak_${currentStreakDays}_days`
          }]
        };
        
        console.log('错误情况下，直接设置周期奖励状态:', true, fallbackData);
        setHasCycleReward(true);
        setCycleRewardData(fallbackData);
      } else {
        setHasCycleReward(false);
        setCycleRewardData(null);
      }
    }
  };
  
  // 移除了测试用的useEffect，周期奖励现在通过checkCycleReward函数正常检查

  // 组件加载时检查今天是否有奖励和周期奖励
  useEffect(() => {
    if (userId && isStreakToday) {
      checkTodayHasReward();
    }
    
    // 检查周期奖励，无论是否今天连胜，但需要有userId
    if (userId) {
      checkCycleReward();
    }
  }, [userId, isStreakToday, streakDays]);
  // 根据是否今天连胜选择颜色主题
  const theme = isStreakToday ? {
    bg: 'bg-yellow-50',
    title: 'text-yellow-800',
    number: 'text-yellow-600',
    iconBg1: 'bg-yellow-200',
    iconBg2: 'bg-yellow-300',
    iconColor: 'text-yellow-700',
    tipBg: 'bg-orange-100',
    tipIcon: 'text-orange-500'
  } : {
    bg: 'bg-gray-50',
    title: 'text-gray-700',
    number: 'text-gray-600',
    iconBg1: 'bg-gray-200',
    iconBg2: 'bg-gray-300',
    iconColor: 'text-gray-700',
    tipBg: 'bg-gray-100',
    tipIcon: 'text-gray-500'
  };

  // 检查是否有可领取的奖励
  const checkForRewards = async () => {
    // 设置加载状态
    setLoading(true);
    setRewardStatus('idle');
    setErrorMessage('');
    
    // 检查是否当天完成任务取得连胜
    if (!isStreakToday) {
      setLoading(false);
      setRewardData({
        has_reward: false,
        message: '今天需要完成任务并取得连胜后才能领取奖励'
      });
      setShowRewardModal(true);
      return;
    }
    
    // 检查是否有用户ID
    if (!userId) {
      setLoading(false);
      setRewardData({
        has_reward: false,
        message: '请先登录以领取奖励'
      });
      setShowRewardModal(true);
      return;
    }
    
    try {
      // 准备请求头
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('x-user-id', userId);
      
      // 从API获取日期奖励数据
      const response = await fetch('/api/streak-rewards/date', {
        method: 'GET',
        headers: headers
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.rewards)) {
        // 获取今天的日期，格式化为YYYY-MM-DD
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // 查找今天是否有设置日期奖励
        const todayReward = data.rewards.find((reward: any) => reward.date === todayStr);
        
        if (todayReward) {
          // 检查用户是否已经领取过今天的特定日期奖励
          // 使用更精确的查询参数确保只检查日期奖励，不影响连胜目标奖励
          const checkClaimResponse = await fetch(`/api/rewards/claimed?user_id=${userId}&reward_date=${todayStr}&reward_type=specific_date_reward`, {
            method: 'GET',
            headers: headers
          });
          
          const claimData = await checkClaimResponse.json();
          
          if (claimData.claimed) {
            // 已经领取过奖励
            setRewardData({
              has_reward: false,
              message: '今天的奖励已经领取过了'
            });
            setShowRewardModal(true);
          } else {
            // 构造奖励数据对象
            let rewardData;
            
            // 根据奖励类型构造不同的奖励数据
            if (todayReward.reward_type === 'product') {
              // 商品奖励
              rewardData = {
                has_reward: true,
                streak_days: streakDays,
                reward_type: 'item', // 商品类型
                reward_date: todayStr, // 添加奖励日期
                reward_name: `${todayStr} 连胜商品奖励`,
                reward_description: `特殊奖励日取得连胜，获得${todayReward.product_name || '特殊商品'}！`,
                reward_icon: todayReward.icon || '🎁',
                item_name: todayReward.product_name || '特殊商品',
                item_id: todayReward.product_id,
                item_description: todayReward.description || '特殊商品'
              };
            } else {
              // 积分奖励
              let coins = 0;
              let diamonds = 0;
              let energy = 0;
              
              // 根据奖励类型设置对应的值
              if (todayReward.reward_type === 'coins') {
                coins = todayReward.reward_amount;
              } else if (todayReward.reward_type === 'diamonds') {
                diamonds = todayReward.reward_amount;
              } else if (todayReward.reward_type === 'energy') {
                energy = todayReward.reward_amount;
              }
              
              rewardData = {
                has_reward: true,
                streak_days: streakDays,
                reward_type: 'points', // 积分类型
                reward_date: todayStr, // 添加奖励日期
                reward_name: `${todayStr} 连胜积分奖励`,
                reward_description: `今天的奖励是积分奖励！`,
                reward_icon: '🎯',
                coins: coins,
                diamonds: diamonds,
                energy: energy
              };
            }
            
            setRewardData(rewardData);
            setShowRewardModal(true);
          }
        } else {
          // 没有找到今天的奖励
          setRewardData({
            has_reward: false,
            message: '今天没有设置连胜奖励'
          });
          setShowRewardModal(true);
        }
      } else {
        // API返回错误或数据格式不正确
        setRewardData({
          has_reward: false,
          message: data.message || '获取奖励信息失败'
        });
        setShowRewardModal(true);
      }
    } catch (error) {
      console.error('获取奖励数据失败:', error);
      setErrorMessage('获取奖励信息失败，请检查网络连接或稍后重试');
      setRewardData({
        has_reward: false,
        message: '获取奖励信息失败，请检查网络连接或稍后重试'
      });
      setShowRewardModal(true);
    } finally {
      setLoading(false);
    }
  };

  // 领取奖励
  const claimReward = async () => {
    if (!rewardData || !rewardData.has_reward || !userId) return;
    
    setLoading(true);
    setRewardStatus('idle');
    setErrorMessage('');
    
    try {
      // 准备请求头
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('x-user-id', userId);
      
      // 获取奖励日期 - 优先使用rewardData中的日期，如果没有则使用今天的日期
      const rewardDate = rewardData.reward_date || new Date().toISOString().split('T')[0];
      
      // 构造请求数据
      let requestData: {
        reward_type: any;
        reward_date: string;
        coins?: number;
        diamonds?: number;
        energy?: number;
        item_id?: number;
        item_name?: string;
        item_image?: string | null;
        reward_source?: string;
        streak_days?: number;
        cycle_rewards?: any[];
      } = {
        reward_type: rewardData.reward_type,
        reward_date: rewardDate
      };
      
      // 根据奖励类型添加相应的字段
      if (rewardData.reward_type === 'points') {
        requestData = {
          ...requestData,
          coins: rewardData.coins || 0,
          diamonds: rewardData.diamonds || 0,
          energy: rewardData.energy || 0,
          reward_source: 'date_reward' // 明确标识这是日期奖励
        };
      } else if (rewardData.reward_type === 'item') {
        // 确保添加商品奖励所需的所有字段
        requestData = {
          ...requestData,
          item_id: rewardData.item_id,
          item_name: rewardData.item_name,
          item_image: rewardData.item_image || null,
          reward_source: 'date_reward' // 明确标识这是日期奖励
        };
        
        // 添加日志以便调试
        console.log('商品奖励数据:', requestData);
      } else if (rewardData.reward_type === 'cycle') {
        // 周期奖励
        requestData = {
          ...requestData,
          streak_days: rewardData.streak_days,
          cycle_rewards: rewardData.cycle_rewards,
          reward_source: 'cycle_reward' // 明确标识这是周期奖励
        };
        
        // 添加日志以便调试
        console.log('周期奖励数据:', requestData);
      }
      
      // 调用领取奖励的API
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (data.success) {
          // 使用API返回的消息
          setRewardStatus('success');
          setRewardData({
            ...rewardData,
            claimed: true,
            claimed_reward: {
              success: true,
              message: data.message || '奖励领取成功！',
              reward_type: rewardData.reward_type,
              item_image: data.reward_details?.item_image || null,
              item_name: data.reward_details?.item_name || null,
              data: data.reward_details
            }
          });
          
          // 延迟关闭弹窗，让用户看到成功消息
          setTimeout(() => {
            setShowRewardModal(false);
            // 刷新页面以更新数据
            router.refresh();
          }, 2000);
      } else {
        setRewardStatus('error');
        setErrorMessage(data.message || '领取奖励失败');
        console.error('领取奖励失败:', data.message);
        setTimeout(() => {
          setRewardStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('领取奖励失败:', error);
      setRewardStatus('error');
      setErrorMessage('网络错误，请检查您的连接');
      setTimeout(() => {
        setRewardStatus('idle');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // 关闭奖励弹窗
  const closeRewardModal = () => {
    setShowRewardModal(false);
    setRewardData(null);
    setRewardStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="block bg-white rounded-3xl shadow-lg overflow-hidden mb-8 hover:shadow-xl transition-shadow">
      <Link 
        href="/streak-calendar" 
        className="block cursor-pointer"
        prefetch={false}
      >
        <div className={`${theme.bg} p-6`}>
          <h2 className={`text-lg font-bold ${theme.title} mb-3`}>连胜精英俱乐部</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-5xl font-bold ${theme.number}`}>{streakDays}</span>
              <span className={`ml-2 ${theme.number} font-medium`}>天连胜啦！</span>
            </div>
            <div className={`w-16 h-16 ${theme.iconBg1} rounded-full flex items-center justify-center`}>
              <div className={`w-12 h-12 ${theme.iconBg2} rounded-full flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${theme.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* 提示框 */}
          <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start">
              <div className={`${theme.tipBg} rounded-full p-1 mr-3 mt-0.5`}>
                <svg className={`w-4 h-4 ${theme.tipIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-700">{isStreakToday ? '太棒了！今天已经连胜，继续保持！' : '今天就来完成个任务，延续连胜！'}</p>
                <div className="mt-2 flex justify-between items-center">
                  {!isStreakToday && (
                    <span 
                      onClick={() => router.push('/tasks')}
                      className="inline-block text-blue-500 font-medium text-sm hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      延续连胜 →
                    </span>
                  )}
                  <span className="text-sm text-gray-500">点击查看详情 →</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 神秘奖励提示 */}
          {hasTodayReward && (
            <div className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3 mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium">恭喜获得神秘奖励！</p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      checkForRewards();
                    }}
                    className="mt-2 bg-white text-purple-600 font-bold py-1.5 px-4 rounded-lg hover:bg-purple-100 transition-colors transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    🎁 点击领取奖励
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 周期奖励提示 - 根据连胜天数是否是周期奖励周期天数的倍数来显示 */}
          {hasCycleReward && cycleRewardData && (
            <div className="mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3 mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium">🎉 恭喜达到 {streakDays} 天连胜！</p>
                  <button
                    onClick={() => {
                      // 跳转到连胜日历页面
                      window.location.href = '/streak-calendar';
                    }}
                    className="mt-2 bg-white text-blue-600 font-bold py-1.5 px-4 rounded-lg hover:bg-blue-100 transition-colors transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    🏆 领取连胜奖励
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>
      
      {/* 测试按钮已移除 */}
      
      {/* 奖励弹窗 */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">连胜奖励</h3>
              {loading ? (
                <p className="text-gray-600">正在检查奖励中...</p>
              ) : rewardData?.has_reward ? (
                <>
                  <p className="text-lg text-gray-600 mb-4">恭喜你，解锁了神秘奖励!</p>
                  <div className="bg-yellow-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-center">
                      <div className="text-4xl mr-3">{rewardData.reward_icon || '🎁'}</div>
                      <div>
                        <div className="text-xl font-bold text-yellow-600">{rewardData.reward_name}</div>
                        <div className="text-yellow-700">{rewardData.reward_description}</div>
                      </div>
                    </div>
                    
                    {/* 根据奖励类型显示不同的奖励详情 */}
                    {rewardData.reward_type === 'points' ? (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="bg-yellow-100 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-yellow-600">💰</div>
                          <div className="mt-1 font-medium text-yellow-700">{rewardData.coins}</div>
                          <div className="text-xs text-yellow-600">金币</div>
                        </div>
                        <div className="bg-blue-100 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-blue-600">💎</div>
                          <div className="mt-1 font-medium text-blue-700">{rewardData.diamonds}</div>
                          <div className="text-xs text-blue-600">钻石</div>
                        </div>
                        <div className="bg-green-100 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">⚡</div>
                          <div className="mt-1 font-medium text-green-700">{rewardData.energy}</div>
                          <div className="text-xs text-green-600">能量</div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 bg-white rounded-xl p-4 border border-yellow-200">
                        <div className="font-bold text-lg text-gray-800">{rewardData.item_name}</div>
                        <div className="mt-2 text-gray-600 text-sm">{rewardData.item_description}</div>
                        <div className="mt-3 bg-yellow-50 inline-block px-3 py-1 rounded-full text-xs text-yellow-700 font-medium">
                          物品ID: {rewardData.item_id}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-600">{rewardData?.message || '当前没有可领取的连胜奖励'}</p>
              )}
            </div>
            
            <div className="flex flex-col space-y-3">
              {rewardStatus === 'success' && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg">
                {rewardData?.claimed_reward?.message || '✅ 奖励领取成功！'}
                
                {rewardData?.claimed_reward?.item_image && (
                  <div className="flex flex-col items-center justify-center mt-4">
                    <img 
                      src={rewardData.claimed_reward.item_image} 
                      alt={rewardData.claimed_reward.item_name || '奖励商品'} 
                      className="w-40 h-40 object-contain rounded-lg"
                    />
                    {rewardData?.claimed_reward?.item_name && (
                      <div className="mt-2 font-bold text-green-800">{rewardData.claimed_reward.item_name}</div>
                    )}
                  </div>
                )}
                
                {rewardData?.reward_type === 'item' && (
                  <div className="mt-3 bg-green-100 text-green-800 text-center py-2 rounded-lg font-medium">
                    ✅ 已添加到背包
                  </div>
                )}
              </div>
            )}
              
              {rewardStatus === 'error' && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-center">
                  {errorMessage || '❌ 操作失败，请稍后重试'}
                </div>
              )}
              
              {rewardData?.has_reward && !rewardData.claimed && !loading && (
                <>
                  {isStreakToday ? (
                    <button
                      onClick={claimReward}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      领取奖励
                    </button>
                  ) : (
                    <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-center">
                      ⚠️ 需要完成今日任务并取得连胜后才能领取奖励
                    </div>
                  )}
                </>
              )}
              
              <button
                onClick={closeRewardModal}
                className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreakSummary;