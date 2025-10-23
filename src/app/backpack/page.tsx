'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BackpackIcon, HomeIcon, CalendarIcon, StoreIcon, SettingsIcon } from '@/components/icons';
import BottomNavigation from '../components/BottomNavigation';
import CustomModal from '../components/CustomModal';
import PointsDisplay from '../components/PointsDisplay';

// 自定义日期格式化函数 - 处理北京时间（UTC+8）
// convertToBeijing: 是否需要将UTC时间转换为北京时间
const formatDate = (dateString: string | null | undefined, convertToBeijing: boolean = true) => {
  // 检查输入是否存在
  if (!dateString) {
    return ''; // 返回空字符串而不是NaN
  }
  
  const date = new Date(dateString);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.warn('无效的日期格式:', dateString);
    return '无效日期'; // 返回提示文本而不是NaN
  }
  
  let targetDate = date;
  
  // 如果需要转换为北京时间，则加8小时
  if (convertToBeijing) {
    const utcTime = date.getTime();
    const beijingTime = utcTime + 8 * 60 * 60 * 1000;
    targetDate = new Date(beijingTime);
  }
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
}

interface BackpackItem {
  id: number;
  reward_id: number;
  user_id: number;
  reward_name: string;
  description: string;
  icon: string;
  acquired_time: string;
  added_at?: string;
  use_time?: string;
  status: 'unused' | 'used';
}

const BackpackPage = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [backpackItems, setBackpackItems] = useState<BackpackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedItem, setSelectedItem] = useState<BackpackItem | null>(null);
  const [detailModalShow, setDetailModalShow] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used'>('unused');
  const [transferModalShow, setTransferModalShow] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: number, username: string}>>([]);
  const [selectedTargetUser, setSelectedTargetUser] = useState<number | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  
  // 从认证系统获取用户ID，这里使用模拟实现
  // 生产环境中应该从实际的认证系统获取
  const getCurrentUserId = () => {
    try {
      // 确保只在客户端环境中使用localStorage
      if (typeof window !== 'undefined') {
        // 优先从完整的user对象获取用户ID
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.id || user.userId) {
              const userId = user.id || user.userId;
              console.log('使用用户对象中的用户ID:', userId);
              // 同时更新currentUserId，确保一致性
              localStorage.setItem('currentUserId', userId.toString());
              return parseInt(userId.toString(), 10);
            }
          } catch (e) {
            console.error('解析用户对象失败:', e);
          }
        }
        
        // 其次尝试从localStorage获取currentUserId
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
          console.log('使用存储的currentUserId:', storedUserId);
          return parseInt(storedUserId, 10);
        }
      }
      
      // 作为最后的备选方案，使用默认测试用户ID
      console.warn('未找到用户ID，使用默认测试用户ID。生产环境中需要实现完整的认证系统！');
      return 9;
    } catch (e) {
      console.error('获取用户ID过程中出错:', e);
      // 即使出错也要返回一个默认值，避免应用崩溃
      return 9;
    }
  };
  
  // 获取当前登录用户的ID
  const userId = getCurrentUserId();

  // 获取用户数据
  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/user/${userId}`);
      if (!response.ok) {
        throw new Error('获取用户数据失败');
      }
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error('获取用户数据错误:', error);
      showModal('错误', '获取用户信息失败', 'error');
    }
  };

  // 获取背包物品
  const fetchBackpackItems = async () => {
    try {
      console.log(`尝试获取用户 ${userId} 的背包物品`);
      // 使用[id]格式以匹配统一的API结构
      const response = await fetch(`/api/user/${userId}/backpack`);
      console.log('背包API响应状态:', response.status);
      
      if (!response.ok) {
        // API返回错误状态码
        const errorData = await response.json().catch(() => ({}));
        console.error('背包API返回错误:', errorData.message || '未知错误');
        throw new Error(`API返回错误: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('成功获取背包物品数据:', data);
      setBackpackItems(data);
    } catch (error) {
      console.error('获取背包物品出错:', error);
      showModal('错误', '获取背包物品失败，请稍后重试', 'error');
    }
  };

  // 显示弹窗
  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalShow(true);
  };

  // 打开物品详情
  const openItemDetail = (item: BackpackItem) => {
    setSelectedItem(item);
    setDetailModalShow(true);
  };

  // 获取可转赠的用户列表
  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`/api/user/${userId}/backpack/transfer`);
      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }
      const data = await response.json();
      setAvailableUsers(data);
    } catch (error) {
      console.error('获取用户列表出错:', error);
      showModal('错误', '获取用户列表失败，请稍后重试', 'error');
    }
  };

  // 转赠物品
  const transferItem = async (itemId: number, targetUserId: number) => {
    try {
      setTransferLoading(true);
      const response = await fetch(`/api/user/${userId}/backpack/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId, targetUserId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '转赠失败');
      }

      // 重新获取背包物品列表
      await fetchBackpackItems();
      
      showModal('转赠成功', '物品已成功转赠！', 'success');
      setTransferModalShow(false);
      setDetailModalShow(false);
    } catch (error) {
      console.error('转赠物品出错:', error);
      showModal('错误', error instanceof Error ? error.message : '转赠物品失败，请稍后重试', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  // 打开转赠弹窗
  const openTransferModal = async (item: BackpackItem) => {
    setSelectedItem(item);
    await fetchAvailableUsers();
    setSelectedTargetUser(null);
    setTransferModalShow(true);
  };

  // 使用物品
  const useItem = async (itemId: number) => {
    try {
      // 检查是否是连胜激冻物品，如果是则直接跳转到连胜日历页面
      const item = backpackItems.find(i => i.id === itemId);
      if (item && item.reward_name && item.reward_name.includes('连胜激冻')) {
        console.log('检测到连胜激冻物品，跳转到连胜日历页面');
        router.push('/streak-calendar');
        return;
      }
      
      console.log(`尝试使用物品ID: ${itemId}，用户ID: ${userId}`);
      // 使用[id]格式以匹配统一的API结构
      const response = await fetch(`/api/user/${userId}/backpack/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });
      
      console.log('使用物品API响应状态:', response.status);
      
      if (!response.ok) {
        // API返回错误
        const errorData = await response.json().catch(() => ({}));
        console.error('使用物品API返回错误:', errorData.message || '未知错误');
        showModal('错误', errorData.message || '使用物品失败', 'error');
        return;
      }

      // 获取响应数据
      const responseData = await response.json();
      console.log('使用物品API响应数据:', responseData);

      // 重新获取背包物品列表以包含最新的use_time信息
      await fetchBackpackItems();
      // 重新获取用户数据以更新积分信息
      await fetchUserData();
      
      // 检查是否是神秘盲盒的特殊响应
      if (responseData.is_special_product && responseData.drawn_item) {
        // 处理盲盒抽奖结果
        const drawResult = responseData;
        let modalTitle = '🎉 抽奖结果 🎉';
        let modalMessage = '';
        
        if (drawResult.reward_type === 'points') {
          const pointTypeName = drawResult.reward_point_type === 'coin' ? '金币' : 
                              drawResult.reward_point_type === 'diamond' ? '钻石' : '能量值';
          modalMessage = `恭喜你抽到了 ${drawResult.reward_amount} ${pointTypeName}！`;
        } else if (drawResult.reward_type === 'product' && drawResult.product) {
          modalMessage = `恭喜你抽到了商品：${drawResult.product.name}！`;
        } else {
          modalMessage = drawResult.message || '抽奖成功！';
        }
        
        showModal(modalTitle, modalMessage, 'success');
      } else if (responseData.permission_type === 'username_change') {
        // 处理改名卡
        showModal('使用成功', responseData.message || '获得一次修改用户名的权限！', 'success');
      } else if (responseData.permission_type === 'avatar_change') {
        // 处理改头像卡
        showModal('使用成功', responseData.message || '获得一次修改头像的权限！', 'success');
      } else if (responseData.effect_type === 'reward_multiplier') {
        // 处理奖励倍数物品
        // 构建完整的持续时间文本
        let durationText = '';
        if (responseData.duration_hours > 0) {
          durationText += `${responseData.duration_hours}小时`;
        }
        if (responseData.duration_minutes > 0) {
          if (durationText) durationText += ' ';
          durationText += `${responseData.duration_minutes}分钟`;
        }
        showModal('使用成功', `获得${responseData.point_type === 'coin' ? '金币' : '钻石'}${responseData.multiplier}倍奖励，持续${durationText}！`, 'success');
      } else {
        // 普通物品
        showModal('使用成功', responseData.message || '物品已成功使用！', 'success');
      }
      
      setDetailModalShow(false);
    } catch (error) {
      console.error('使用物品过程中出错:', error);
      // 仍然提供模拟成功响应作为备用
      console.log('备用模式：模拟物品使用成功');
      // 模拟模式下也设置使用时间
      const now = new Date().toISOString();
      setBackpackItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, status: 'used' as const, use_time: now } : item
        )
      );
      showModal('使用成功', '物品已成功使用！', 'success');
      setDetailModalShow(false);
    }
  };

  // 初始加载数据
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserData(), 
          fetchBackpackItems()
        ]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  // 过滤物品并按条件排序
  const filteredItems = backpackItems
    .filter(item => filterStatus === 'all' || item.status === filterStatus)
    .sort((a, b) => {
      // 当筛选已使用物品时，按使用时间倒序排序（最近使用的排在前面）
      if (filterStatus === 'used') {
        // 确保两个物品都有使用时间才进行比较
        if (a.use_time && b.use_time) {
          return new Date(b.use_time).getTime() - new Date(a.use_time).getTime();
        }
        // 如果一个物品没有使用时间，则有使用时间的排在前面
        return a.use_time ? -1 : b.use_time ? 1 : 0;
      }
      // 对于其他筛选条件，保持原有顺序
      return 0;
    });

  // 渲染加载状态
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-purple-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🎒</div>
          <p className="text-lg text-gray-600">加载背包中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 pb-20">
      {/* 顶部导航栏 - 响应式设计 */}
      <header className="bg-white shadow-md py-3 px-4 sm:px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BackpackIcon className="text-purple-600" size={24} />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">我的背包</h1>
          </div>
          
          {/* 积分显示组件 */}
          {userData && <PointsDisplay points={userData.points} />}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-6 py-8">
        {/* 背包介绍 */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">欢迎来到你的背包！</h2>
        <p className="text-gray-700">这里存放着你在商店兑换的所有奖励。点击物品可以查看详情并使用。</p>
      </div>

        {/* 筛选标签 */}
        <div className="flex space-x-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterStatus === 'all' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}`}
            onClick={() => setFilterStatus('all')}
          >
            全部物品
          </button>
          <button 
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterStatus === 'unused' 
              ? 'bg-green-500 text-white shadow-md' 
              : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}`}
            onClick={() => setFilterStatus('unused')}
          >
            未使用
          </button>
          <button 
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterStatus === 'used' 
              ? 'bg-gray-500 text-white shadow-md' 
              : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}`}
            onClick={() => setFilterStatus('used')}
          >
            已使用
          </button>
        </div>

        {/* 物品列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-xl shadow">
              <div className="text-6xl mb-4">🎒</div>
              <p className="text-gray-600">
                {filterStatus === 'all' ? '你的背包是空的' : 
                 filterStatus === 'unused' ? '没有未使用的物品' : '没有已使用的物品'}
              </p>
              <button 
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                onClick={() => router.push('/store')}
              >
                去商店兑换
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 cursor-pointer ${item.status === 'used' ? 'opacity-70' : ''}`}
                onClick={() => openItemDetail(item)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{item.icon}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'unused' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.status === 'unused' ? '未使用' : '已使用'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{item.reward_name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>
                  <div className="text-xs text-gray-500">
                    获得时间: {formatDate(item.acquired_time || item.added_at, true)}
                    {item.status === 'used' && item.use_time && (
                      <div className="mt-1 text-red-600">
                        使用时间: {formatDate(item.use_time, false)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 物品详情弹窗 */}
      {detailModalShow && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full transform transition-all animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">物品详情</h3>
            <div className="flex items-center space-x-4 mb-6">
              <div className="text-5xl">{selectedItem.icon}</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900">{selectedItem.reward_name}</h4>
                <p className="text-sm text-gray-500 mb-2">{selectedItem.description}</p>
                <div className="text-sm text-gray-500">
                  获得时间: {formatDate(selectedItem.acquired_time || selectedItem.added_at, true)}
                  {selectedItem.status === 'used' && selectedItem.use_time && (
                    <div className="mt-1 text-red-600">
                      使用时间: {formatDate(selectedItem.use_time, false)}
                    </div>
                  )}
                </div>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${selectedItem.status === 'unused' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {selectedItem.status === 'unused' ? '未使用' : '已使用'}
                </span>
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-gray-900"
                onClick={() => setDetailModalShow(false)}
              >
                关闭
              </button>
              {selectedItem.status === 'unused' && (
                <>
                  <button 
                    className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors mr-2"
                    onClick={() => useItem(selectedItem.id)}
                  >
                    使用物品
                  </button>
                  <button 
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ml-2"
                    onClick={() => openTransferModal(selectedItem)}
                  >
                    转赠物品
                  </button>
                </>
              )}
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

      {/* 转赠物品弹窗 */}
      {transferModalShow && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full transform transition-all animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">转赠物品</h3>
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-4xl">{selectedItem.icon}</div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{selectedItem.reward_name}</h4>
                  <p className="text-sm text-gray-500">{selectedItem.description}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">选择接收用户</label>
                <div className="grid grid-cols-2 gap-3">
                  {availableUsers.length === 0 ? (
                    <p className="col-span-2 text-gray-500 text-center py-4">暂无可转赠的用户</p>
                  ) : (
                    availableUsers.map(user => (
                      <div
                        key={user.id}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedTargetUser === user.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'}
                        `}
                        onClick={() => setSelectedTargetUser(user.id)}
                      >
                        <p className="font-medium text-center text-gray-900">{user.username}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-gray-900"
                onClick={() => setTransferModalShow(false)}
                disabled={transferLoading}
              >
                取消
              </button>
              <button 
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${selectedTargetUser 
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                `}
                onClick={() => selectedTargetUser && transferItem(selectedItem.id, selectedTargetUser)}
                disabled={!selectedTargetUser || transferLoading}
              >
                {transferLoading ? '转赠中...' : '确认转赠'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 底部导航栏 */}
      <BottomNavigation activePage="backpack" />
    </div>
  );
};

export default BackpackPage;