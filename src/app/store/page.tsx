'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomeIcon, CalendarIcon, SettingsIcon, StoreIcon, BackpackIcon, CartIcon, DiamondIcon, BatteryIcon } from '@/components/icons';
import { Gift } from 'lucide-react';
// 使用emoji替代Gift图标组件
import PointsDisplay from '../components/PointsDisplay';
import CustomModal from '../components/CustomModal';
import BottomNavigation from '../components/BottomNavigation';
import { getLevelName, getLevelNameByLevel, getMinEnergyByLevel } from '@/lib/levelUtils';

// 自定义HistoryIcon组件
const HistoryIcon = ({ className = '', size = 24 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <line x1="12" x2="12.01" y1="15" y2="15" />
    <line x1="12" x2="12.01" y1="9" y2="13" />
  </svg>
);

// 自定义日期格式化函数 - 强制使用北京时间（UTC+8）
const formatDate = (dateString: string) => {
  if (!dateString) return '未知时间';
  
  try {
    // 解析日期字符串
    const date = new Date(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效时间';
    }
    
    // 转换为北京时间（UTC+8）
    const utcTime = date.getTime();
    const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1000); // 添加8小时偏移量
    
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    const hours = String(beijingTime.getHours()).padStart(2, '0');
    const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '未知时间';
  }
};

// 自定义Badge组件
const Badge = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
      {children}
    </span>
  );
};

interface Points {
  coins: number;
  diamonds: number;
  energy: number;
  level: number;
  streak_days: number;
}

interface UserData {
  id: number;
  username: string;
  role: string;
  points: Points;
  userId: string;
  achievements?: any[];
}

interface Reward {
  id: number;
  name: string;
  description: string;
  cost_type: 'coin' | 'diamond' | 'coins' | 'diamonds' | 'energy';
  cost_amount: number;
  icon: string;
  is_active: boolean;
  min_level?: number;
}

interface RedemptionHistory {
  id: number;
  user_id: number;
  reward_id: number;
  redemption_time: string;
  cost_type: string;
  cost_amount: number;
  reward_name: string;
  description: string;
  icon: string;
  status?: string;
}

const StorePage = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemModalShow, setRedeemModalShow] = useState(false);
  const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards');
  const [filterType, setFilterType] = useState<string>('all');
  
  // 获取最新用户数据
  const fetchLatestUserData = async (userId: number) => {
    if (!userId) {
      console.log('用户ID不存在，跳过数据刷新');
      return;
    }
    try {
      console.log(`发送请求到 /api/user/${userId}`);
      // 从后端API获取最新用户数据
      const response = await fetch(`/api/user/${userId}`);
      console.log('API响应状态:', response.status);
      
      if (response.ok) {
        const latestData = await response.json();
        console.log('解析后的最新用户数据:', latestData);
        
        // 更新localStorage
        const updatedUser = {
          ...latestData,
          userId: latestData.id || latestData.userId,
          achievements: userData?.achievements || []
        };
        console.log('准备保存到localStorage的数据:', updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('localStorage更新成功');
        
        // 更新UI显示
        setUserData(updatedUser);
        console.log('UI数据更新成功');
      } else {
        console.error('获取最新用户数据失败，状态码:', response.status);
      }
    } catch (error) {
      console.error('获取用户数据网络错误:', error);
    }
  };

  // 获取用户数据
  const fetchUserData = async () => {
    try {
      // 先从localStorage读取用户数据
      const userStr = localStorage.getItem('user');
      console.log('从localStorage读取用户数据:', userStr);
      
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('解析后的用户数据:', user);
        // 先显示localStorage中的数据
        setUserData(user);
        
        // 然后从后端获取最新数据
        console.log('调用API获取最新用户数据，用户ID:', user.userId);
        await fetchLatestUserData(user.userId);
      } else {
        // 默认使用用户ID 9作为测试（仅用于开发环境）
        console.warn('未找到存储的用户数据，使用默认测试用户ID 9。生产环境中需要实现完整的认证系统！');
        // 尝试获取默认用户的数据
        await fetchLatestUserData(9);
      }
    } catch (error) {
      console.error('获取用户数据错误:', error);
      showModal('错误', '获取用户信息失败，请重新登录', 'error');
      // 处理未登录情况
      // router.push('/login');
    }
  };

  // 获取奖励列表
  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/rewards');
      if (!response.ok) {
        throw new Error('获取奖励列表失败');
      }
      const data = await response.json();
      // 只显示激活的奖励
      const activeRewards = data.filter((reward: Reward) => reward.is_active);
      
      // 根据筛选类型过滤奖励
      let filteredRewards = activeRewards;
      if (filterType === 'coins') {
        filteredRewards = activeRewards.filter((reward: Reward) => 
          reward.cost_type === 'coin' || reward.cost_type === 'coins'
        );
      } else if (filterType === 'diamonds') {
        filteredRewards = activeRewards.filter((reward: Reward) => 
          reward.cost_type === 'diamond' || reward.cost_type === 'diamonds'
        );
      }
      
      setRewards(filteredRewards);
    } catch (error) {
      console.error('获取奖励列表错误:', error);
      showModal('错误', '加载商店商品失败，请稍后再试', 'error');
    }
  };
  
  // 获取兑换历史
  const fetchRedemptionHistory = async () => {
    // 确保用户数据已加载
    if (!userData?.userId) {
      console.log('用户数据未加载，无法获取兑换历史');
      return;
    }
    
    try {
      // 使用正确的API路径，从userData中获取userId
      const response = await fetch(`/api/rewards/redeem?userId=${userData.userId || 9}`);
      if (!response.ok) {
        throw new Error(`API请求失败，状态码: ${response.status}`);
      }
      const data = await response.json();
      setRedemptionHistory(data);
    } catch (error) {
      console.log('使用模拟兑换历史数据');
      // 使用模拟数据作为后备
      setRedemptionHistory([
        { id: 1, reward_name: '乐高积木', description: '精美乐高积木套装', cost_type: 'coins', cost_amount: 1000, redemption_time: new Date(Date.now() - 86400000).toISOString(), status: 'completed', user_id: 1, reward_id: 1, icon: '🧩' },
        { id: 2, reward_name: '小台灯', description: '护眼小台灯', cost_type: 'diamonds', cost_amount: 50, redemption_time: new Date(Date.now() - 172800000).toISOString(), status: 'completed', user_id: 1, reward_id: 2, icon: '💡' },
        { id: 3, reward_name: '拼图玩具', description: '100片拼图', cost_type: 'coins', cost_amount: 500, redemption_time: new Date(Date.now() - 259200000).toISOString(), status: 'completed', user_id: 1, reward_id: 3, icon: '🧩' }
      ]);
    }
  };

  // 显示弹窗
  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalShow(true);
  };
  
  // 获取积分图标组件
  const getPointIcon = (type: string | undefined) => {
    if (!type) return null;
    switch (type.toLowerCase()) {
      case 'coin':
      case 'coins':
        return <CartIcon className="text-yellow-500" size={20} />;
      case 'diamond':
      case 'diamonds':
        return <DiamondIcon className="text-blue-500" size={20} />;
      case 'energy':
        return <BatteryIcon className="text-green-500" size={20} />;
      default:
        return null;
    }
  };
  
  // 获取积分名称
  const getPointName = (type: string | undefined) => {
    if (!type) return '积分';
    switch (type.toLowerCase()) {
      case 'coin':
      case 'coins':
        return '金币';
      case 'diamond':
      case 'diamonds':
        return '钻石';
      case 'energy':
        return '能量';
      default:
        return type;
    }
  };
  
  // 获取积分颜色
  const getPointColor = (type: string | undefined) => {
    if (!type) return 'text-gray-600';
    switch (type.toLowerCase()) {
      case 'coin':
      case 'coins':
        return 'text-yellow-600';
      case 'diamond':
      case 'diamonds':
        return 'text-blue-600';
      case 'energy':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // 获取积分背景色
  const getPointBgColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'coin':
      case 'coins':
        return 'bg-yellow-100 text-yellow-700';
      case 'diamond':
      case 'diamonds':
        return 'bg-blue-100 text-blue-700';
      case 'energy':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 处理兑换请求
  const handleRedeem = async () => {
    if (!selectedReward || !userData) return;

    try {
      // 检查用户是否有足够的货币
      const costType = selectedReward.cost_type.toLowerCase();
      let userCurrency = 0;
      
      if (costType === 'coin' || costType === 'coins') {
        userCurrency = userData.points.coins;
      } else if (costType === 'diamond' || costType === 'diamonds') {
        userCurrency = userData.points.diamonds;
      } else if (costType === 'energy') {
        userCurrency = userData.points.energy;
      }

      if (userCurrency < selectedReward.cost_amount) {
        showModal(
          '兑换失败', 
          `您的${getPointName(selectedReward.cost_type)}不足，请继续完成任务赚取更多积分`, 
          'error'
        );
        setRedeemModalShow(false);
        return;
      }

      // 发送兑换请求到新的API路由
      const response = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.userId,
          rewardId: selectedReward.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '兑换失败');
      }

      const data = await response.json();
      showModal('兑换成功', `恭喜您成功兑换了${selectedReward.name}！`, 'success');
      setRedeemModalShow(false);
      
      // 刷新用户数据和兑换历史
      await Promise.all([fetchUserData(), fetchRedemptionHistory()]);
    } catch (error: any) {
      console.error('兑换错误:', error);
      showModal('兑换失败', error.message || '请稍后再试', 'error');
      setRedeemModalShow(false);
    }
  };

  // 打开兑换确认弹窗
  const openRedeemModal = (reward: Reward) => {
    setSelectedReward(reward);
    setRedeemModalShow(true);
  };

  // 初始加载数据
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserData(), 
          fetchRewards()
        ]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);
  
  // 当筛选类型改变时，重新获取奖励列表
  useEffect(() => {
    fetchRewards();
  }, [filterType]);
  
  // 当userData加载后且切换到历史标签时，重新获取历史数据
  useEffect(() => {
    if (userData && activeTab === 'history') {
      fetchRedemptionHistory();
    }
  }, [userData, activeTab]);

  // 渲染加载状态
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-purple-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🏪</div>
          <p className="text-lg text-gray-600">加载商店中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 pb-20">

      {/* 顶部导航栏 */}
      <header className="bg-white shadow-md py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StoreIcon className="text-purple-600" size={24} />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">奖励商店</h1>
          </div>
          
          <div className="flex items-center">
            {userData && <PointsDisplay points={userData.points} />}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-6 py-8">
        {/* 商店介绍 */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">欢迎来到奖励商店！</h2>
          <p className="text-gray-700">完成任务赚取金币、钻石和能量，兑换你喜欢的奖励吧！</p>
        </div>

        {/* 标签页切换 */}
        <div className="flex space-x-2 mb-6 bg-white p-1 rounded-full shadow-sm max-w-md mx-auto">
          <button 
            className={`flex-1 py-3 px-4 rounded-full font-medium transition-all ${activeTab === 'rewards' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-gray-600 hover:bg-purple-50'}`}
            onClick={() => setActiveTab('rewards')}
          >
            <span className="flex items-center justify-center">
              <StoreIcon size={18} className="mr-2" /> 可用奖励
            </span>
          </button>
          <button 
            className={`flex-1 py-3 px-4 rounded-full font-medium transition-all ${activeTab === 'history' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-gray-600 hover:bg-purple-50'}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="flex items-center justify-center">
              <HistoryIcon size={18} className="mr-2" /> 兑换历史
            </span>
          </button>
        </div>

        {/* 可用奖励内容 */}
        {activeTab === 'rewards' && (
          <div>
            {/* 商品分类标签 */}
            <div className="flex space-x-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <button 
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterType === 'all' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}`}
                onClick={() => setFilterType('all')}
              >
                全部商品
              </button>
              <button 
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterType === 'coins' 
                  ? 'bg-yellow-500 text-white shadow-md' 
                  : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}`}
                onClick={() => setFilterType('coins')}
              >
                金币商品
              </button>
              <button 
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterType === 'diamonds' 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}`}
                onClick={() => setFilterType('diamonds')}
              >
                钻石商品
              </button>
            </div>

            {/* 商品列表 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-xl shadow">
                  <div className="text-6xl mb-4">🏪</div>
                  <p className="text-gray-600">当前暂无可用商品</p>
                </div>
              ) : (
                rewards.map((reward) => {
                  // 检查用户是否有足够的货币和等级
                  const costType = reward.cost_type.toLowerCase();
                  let userCurrency = 0;
                  let hasEnoughCurrency = false;
                  let hasEnoughLevel = true;
                  
                  if (userData) {
                    // 检查货币
                    if (costType === 'coin' || costType === 'coins') {
                      userCurrency = userData.points.coins;
                    } else if (costType === 'diamond' || costType === 'diamonds') {
                      userCurrency = userData.points.diamonds;
                    } else if (costType === 'energy') {
                      userCurrency = userData.points.energy;
                    }
                    
                    hasEnoughCurrency = userCurrency >= reward.cost_amount;
                    
                    // 检查等级
                    if (reward.min_level && reward.min_level > 0) {
                      hasEnoughLevel = userData.points.energy >= getMinEnergyByLevel(reward.min_level);
                    }
                  }
                  
                  const canRedeem = hasEnoughCurrency && hasEnoughLevel;
                  
                  return (
                    <div 
                      key={reward.id} 
                      className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${canRedeem 
                        ? 'hover:shadow-lg transform hover:-translate-y-1 cursor-pointer' 
                        : 'opacity-80 cursor-not-allowed'}`}
                      onClick={() => canRedeem && openRedeemModal(reward)}
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="text-4xl">{reward.icon}</div>
                          <div className="flex flex-col items-end">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPointBgColor(reward.cost_type)} mb-1`}>
                              {getPointName(reward.cost_type)}
                            </div>
                            {/* 显示等级要求或无限制 */}
                            {(reward.min_level !== undefined && reward.min_level > 0) ? (
                              <div className="text-xs px-2 py-1 rounded-full inline-block bg-orange-100 text-orange-700">
                                🐔 {getLevelNameByLevel(reward.min_level)} 及以上
                              </div>
                            ) : (
                              <div className="text-xs px-2 py-1 rounded-full inline-block bg-green-100 text-green-700">
                                无限制
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{reward.name}</h3>
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{reward.description}</p>
                        <div className="flex justify-between items-center">
                          <div className={`text-lg font-bold ${getPointColor(reward.cost_type)}`}>
                            {reward.cost_amount} {getPointName(reward.cost_type)}
                          </div>
                          <button 
                            className={`px-4 py-2 rounded-lg transition-colors ${canRedeem 
                              ? 'bg-purple-600 text-white hover:bg-purple-700' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              canRedeem && openRedeemModal(reward);
                            }}
                            disabled={!canRedeem}
                          >
                            兑换
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 兑换历史内容 */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {redemptionHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-600">暂无兑换历史</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {redemptionHistory.slice(0, 20).map((item) => (
                  <div key={item.id} className="p-5 hover:bg-purple-50 transition-colors">
                    <div className="flex items-center">
                      <div className="bg-purple-100 rounded-full p-3 mr-4">
                        <span className="text-2xl">{item.icon || '🎁'}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-gray-900">{item.reward_name || '未知奖励'}</h4>
                          <span className="text-xs text-gray-500">
                              {item.redemption_time ? formatDate(item.redemption_time) : '未知时间'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description || '无描述'}</p>
                        <div className="flex items-center mt-2">
                  {getPointIcon(item.cost_type || 'coins')}
                  <span className={`text-sm ${getPointColor(item.cost_type || 'coins')}`}>
                    -{item.cost_amount || 0} {getPointName(item.cost_type || 'coins')}
                  </span>
                </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 ml-4">兑换成功</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>



      {/* 兑换确认弹窗 */}
      {redeemModalShow && selectedReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full transform transition-all animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">确认兑换</h3>
            <div className="flex items-center space-x-4 mb-6">
              <div className="text-5xl">{selectedReward.icon}</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900">{selectedReward.name}</h4>
                <p className="text-sm text-gray-500 mb-2">{selectedReward.description}</p>
                {/* 等级要求在用户信息部分显示 */}
                <div className={`text-lg font-bold ${getPointColor(selectedReward.cost_type)}`}>
                  {selectedReward.cost_amount} {getPointName(selectedReward.cost_type)}
                </div>
                {userData && (
                  <div className="text-xs text-gray-500 mt-1">
                    剩余 {getPointName(selectedReward.cost_type)}: 
                    <span className={`${getPointColor(selectedReward.cost_type)}`}>
                      {selectedReward.cost_type.toLowerCase() === 'coin' || selectedReward.cost_type.toLowerCase() === 'coins'
                        ? userData.points.coins
                        : selectedReward.cost_type.toLowerCase() === 'diamond' || selectedReward.cost_type.toLowerCase() === 'diamonds'
                        ? userData.points.diamonds
                        : userData.points.energy
                      }
                    </span>
                    <div className="mt-1">
                      您的等级: <span className="text-orange-600">{getLevelName(userData.points.energy)}</span>
                      {selectedReward.min_level !== undefined && selectedReward.min_level > 0 ? (
                        <>
                          <br />
                          等级要求: {getLevelNameByLevel(selectedReward.min_level)}
                          {userData.points.energy < getMinEnergyByLevel(selectedReward.min_level) && (
                            <span className="ml-1 text-red-500 text-xs">（等级不足）</span>
                          )}
                        </>
                      ) : (
                        <>
                          <br />
                          等级要求: <span className="text-green-600">无限制</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-gray-900"
                onClick={() => setRedeemModalShow(false)}
              >
                取消
              </button>
              <button 
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                onClick={handleRedeem}
              >
                确认兑换
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示弹窗 */}
      <CustomModal
        show={modalShow}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalShow(false)}
      />
      
      {/* 底部导航栏 */}
      <BottomNavigation activePage="store" />
    </div>
  );
};

export default StorePage;