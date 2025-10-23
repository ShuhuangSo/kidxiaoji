'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChickenIcon, AwardIcon, HomeIcon, StoreIcon, CalendarIcon, SettingsIcon, CartIcon, DiamondIcon } from '@/components/icons';
import BottomNavigation from './components/BottomNavigation';
import CustomModal from './components/CustomModal';
import PointsDisplay from './components/PointsDisplay';
import StreakSummary from './components/StreakSummary';
import MultiplierDisplay from './components/MultiplierDisplay';
import { getLevelName } from '@/lib/levelUtils';

interface Task {
  id: number | string;
  title: string;
  description: string;
  reward_type: 'coin' | 'diamond';
  reward_amount: number;
  status: 'pending' | 'completed' | 'missed';
  expiry_time?: string | null;
  due_date?: string;
  category?: string;
  needs_approval?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  _isCachedData?: boolean;
}

interface UserPoints {
  coins: number;
  diamonds: number;
  energy: number;
  level: number;
  streak_days: number;
  last_streak_date?: string;
  consecutive_missed_days?: number;
  is_streak_today?: boolean;
}

interface UserData {
  username: string;
  userId: number;
  avatar?: string | undefined;
  points: UserPoints;
}

interface Reward {
  id: number;
  name: string;
  description: string;
  cost_type: 'coin' | 'diamond';
  cost_amount: number;
  icon: string;
}
export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // 模态框相关状态
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  // 等级对应关系弹窗状态
  const [levelModalShow, setLevelModalShow] = useState(false);

  // 显示等级对应关系弹窗
  const showLevelModal = () => {
    setLevelModalShow(true);
  };

  // 登录后立即获取最新数据的函数，完全参考profile页面实现
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
      
      const responseText = await response.text();
      console.log('API响应内容:', responseText);
      
      if (response.ok) {
        const latestData = JSON.parse(responseText);
        console.log('解析后的最新用户数据:', latestData);
        
        // 构建更新后的用户数据，完全使用API返回的数据
        const updatedUser = {
          ...latestData,
          userId: latestData.id || latestData.userId,
          // 保留必要的字段以维持与现有代码的兼容性
          points: latestData.points || {
            coins: 0,
            diamonds: 0,
            energy: 0,
            level: 1,
            streak_days: latestData.streak_days || 0,
            is_streak_today: latestData.is_streak_today || false,
            last_streak_date: latestData.last_streak_date || null,
            consecutive_missed_days: latestData.consecutive_missed_days || 0
          }
        };
        
        // 确保points对象存在且结构完整
        if (!updatedUser.points) {
          updatedUser.points = {
            coins: 0,
            diamonds: 0,
            energy: 0,
            level: 1,
            streak_days: latestData.streak_days || 0,
            is_streak_today: latestData.is_streak_today || false,
            last_streak_date: latestData.last_streak_date || null,
            consecutive_missed_days: latestData.consecutive_missed_days || 0
          };
        }
        
        // 保留现有的头像信息
        const existingUserData = localStorage.getItem('user');
        if (existingUserData) {
          try {
            const parsedExistingData = JSON.parse(existingUserData);
            if (parsedExistingData.avatar) {
              updatedUser.avatar = parsedExistingData.avatar;
            }
          } catch (parseError) {
            console.error('Failed to parse existing user data', parseError);
          }
        }
        
        console.log('准备保存到localStorage的数据:', updatedUser);
        
        // 更新localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('localStorage更新成功，连胜天数:', updatedUser.points.streak_days);
        
        // 更新UI显示
        setUserData(updatedUser);
        console.log('UI数据更新成功');
      } else {
        console.error('获取最新用户数据失败，状态码:', response.status);
      }
    } catch (error) {
      console.error('获取用户数据网络错误:', error);
      // 错误时保持原有数据，不做任何更改
    }
  };
  
  // 获取用户头像的函数
  const fetchAvatar = async (userId: number) => {
    try {
      // 尝试从API获取头像
      const response = await fetch(`/api/user/${userId}/avatar`);
      
      if (!response.ok) {
        // 如果头像不存在或获取失败，设置avatar为undefined
        setUserData(prevData => prevData ? { ...prevData, avatar: undefined } : null);
        return;
      }
      
      // 处理头像数据
      const blob = await response.blob();
      const avatarUrl = URL.createObjectURL(blob);
      
      // 更新用户数据和本地存储
      setUserData(prevData => prevData ? { ...prevData, avatar: avatarUrl } : null);
      
      // 更新本地存储中的头像URL
      const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
      currentUserData.avatar = avatarUrl;
      localStorage.setItem('user', JSON.stringify(currentUserData));
    } catch (error) {
      console.error('Error fetching avatar:', error);
      // 发生错误时，设置avatar为undefined
      setUserData(prevData => prevData ? { ...prevData, avatar: undefined } : null);
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        
        // 先设置用户数据，确保页面能正常渲染
        setUserData(user);
        
        // 立即清除本地缓存，确保后续获取最新数据
        localStorage.removeItem('tasks_' + user.userId);
        console.log('清除本地缓存，准备获取最新数据，包括连胜状态');
        
        // 从API获取最新的用户数据，参考profile页面实现
        console.log('调用API获取最新用户数据，用户ID:', user.userId);
        await fetchLatestUserData(user.userId);
        
        // 获取用户头像
        await fetchAvatar(user.userId);
        
        // 用户数据更新逻辑已在fetchLatestUserData函数中处理
        
        // 优先从API获取最新的任务数据
        try {
          // 添加时间戳参数防止缓存
          const timestamp = new Date().getTime();
          const tasksResponse = await fetch(`/api/tasks?user_id=${user.userId}&t=${timestamp}`);
          
          // 即使API返回错误，我们仍然尝试解析响应
          let tasksData;
          try {
            tasksData = await tasksResponse.json();
            console.log('API响应数据:', tasksData);
          } catch (parseError) {
            console.error('解析API响应失败:', parseError);
            tasksData = [];
          }
          
          if (tasksResponse.ok) {
            // API调用成功，处理返回的数据
            const typedTasks = Array.isArray(tasksData) ? tasksData.map((task: any) => ({
              ...task,
              status: task.status as 'pending' | 'completed' | 'missed',
              approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
              _isCachedData: false
            })) : [];
            setTasks(typedTasks);
            console.log('从API获取的任务数据:', tasksData);
            
            // 更新本地存储作为备份
            try {
              const dataToStore = Array.isArray(tasksData) ? tasksData.map((task: any) => {
                const { _isCachedData, ...actualData } = task;
                return actualData;
              }) : tasksData;
              
              localStorage.setItem('tasks_' + user.userId, JSON.stringify(dataToStore));
              console.log('本地存储更新成功');
            } catch (storageError) {
              console.error('更新本地存储失败:', storageError);
            }
          } else {
            console.error(`API错误: ${tasksResponse.status}, 消息: ${tasksData?.message || '未知错误'}`);
            
            // API失败时，尝试使用localStorage作为后备
            const localStorageTasks = localStorage.getItem('tasks_' + user.userId);
            if (localStorageTasks) {
              try {
                const savedTasks = JSON.parse(localStorageTasks);
                const typedTasks = Array.isArray(savedTasks) ? savedTasks.map((task: any) => ({
                  ...task,
                  status: task.status as 'pending' | 'completed' | 'missed',
                  approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
                  _isCachedData: true
                })) : [];
                setTasks(typedTasks);
              } catch (e) {
                console.error('解析localStorage任务数据失败:', e);
                setTasks([]);
              }
            } else {
              setTasks([]);
            }
          }
        } catch (apiError) {
          console.error('API调用异常:', apiError);
          
          // 异常情况下，尝试使用本地存储作为后备
          const localStorageTasks = localStorage.getItem('tasks_' + user.userId);
          if (localStorageTasks) {
            try {
              const savedTasks = JSON.parse(localStorageTasks);
              const typedTasks = Array.isArray(savedTasks) ? savedTasks.map((task: any) => ({
                ...task,
                status: task.status as 'pending' | 'completed' | 'missed',
                approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
                _isCachedData: true
              })) : [];
              setTasks(typedTasks);
            } catch (e) {
              console.error('解析localStorage任务数据失败:', e);
              setTasks([]);
            }
          } else {
            setTasks([]);
          }
        }

        // 获取奖励数据
        try {
          const rewardsResponse = await fetch('/api/rewards');
          const rewardsData = await rewardsResponse.json();
          setRewards(rewardsData);
        } catch (error) {
          console.error('获取奖励数据失败:', error);
          // 奖励数据获取失败时不影响主功能
        }
      } catch (error) {
        console.error('加载数据失败:', error);
        // 错误时使用空数组，不使用模拟数据
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, [router]);
  
  // 添加页面获取焦点时的刷新逻辑，确保从任务页面切换回来时能立即获取最新的连胜状态
  useEffect(() => {
    const handleFocus = () => {
      if (userData?.userId) {
        console.log('页面获取焦点，立即刷新用户数据以获取最新连胜状态...');
        fetchLatestUserData(userData.userId);
      }
    };
    
    // 监听窗口获得焦点事件
    window.addEventListener('focus', handleFocus);
    
    // 监听页面可见性变化，当页面从任务页面切换回来时立即刷新
    const handleVisibilityChange = () => {
      if (!document.hidden && userData?.userId) {
        console.log('页面重新可见，立即刷新用户数据...');
        fetchLatestUserData(userData.userId);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData?.userId]);

  // 添加定时刷新机制，确保后台更新后前台能及时显示最新任务数据和用户状态
  useEffect(() => {
    if (!userData?.userId) return;
    
    const refreshData = async () => {
      console.log('执行数据刷新...');
      
      // 1. 先刷新用户数据（包含连胜状态）
      try {
        await fetchLatestUserData(userData.userId);
      } catch (error) {
        console.error('刷新用户数据失败:', error);
      }
      
      // 2. 然后刷新任务数据
      try {
        // 添加时间戳参数防止缓存
        const timestamp = new Date().getTime();
        const tasksResponse = await fetch(`/api/tasks?user_id=${userData.userId}&t=${timestamp}`);
        
        // 即使API返回错误，我们仍然尝试解析响应
        let tasksData;
        try {
          tasksData = await tasksResponse.json();
          console.log('API响应数据:', tasksData);
        } catch (parseError) {
          console.error('解析API响应失败:', parseError);
          tasksData = [];
        }
        
        if (tasksResponse.ok) {
          // API调用成功，处理返回的数据
          const typedTasks = Array.isArray(tasksData) ? tasksData.map((task: any) => ({
            ...task,
            status: task.status as 'pending' | 'completed' | 'missed',
            approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
            _isCachedData: false
          })) : [];
          setTasks(typedTasks);
          console.log('定时刷新任务数据成功，共', typedTasks.length, '个任务');
          
          // 更新本地存储
          try {
            const dataToStore = Array.isArray(tasksData) ? tasksData.map((task: any) => {
              const { _isCachedData, ...actualData } = task;
              return actualData;
            }) : tasksData;
            
            localStorage.setItem('tasks_' + userData.userId, JSON.stringify(dataToStore));
            console.log('本地存储更新成功');
          } catch (storageError) {
            console.error('更新本地存储失败:', storageError);
          }
        }
      } catch (error) {
        console.error('定时刷新任务数据失败:', error);
        // 定时刷新失败不影响用户体验
      }
    };
    
    // 页面加载后立即刷新一次
    refreshData();
    
    // 设置定时器，每5秒刷新一次数据（进一步缩短刷新间隔，提高实时性）
    const intervalId = setInterval(refreshData, 5000);
    
    // 监听页面可见性变化，页面重新可见时立即刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('页面重新可见，立即刷新数据...');
        refreshData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 组件卸载时清理定时器和事件监听
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData?.userId]);

  // 监听userData变化，确保StreakSummary组件能接收到最新数据
  useEffect(() => {
    if (userData) {
      console.log('用户数据已更新，连胜天数:', userData.points.streak_days, '今日是否连胜:', userData.points.is_streak_today);
    }
  }, [userData]);

  function loadMockData() {
    // 模拟用户数据
    const mockUser: UserData = {
      username: '小明',
      userId: 2,
      points: {
        coins: 1250,
        diamonds: 45,
        energy: 85,
        level: 7,
        streak_days: 5
      }
    };

    // 模拟任务数据
    const mockTasks: Task[] = [
      {
        id: 1,
        title: '完成数学作业',
        description: '完成课本第35-36页的练习题',
        reward_type: 'diamond',
        reward_amount: 5,
        status: 'pending'
      },
      {
        id: 2,
        title: '打扫自己的房间',
        description: '整理床铺、扫地、擦桌子',
        reward_type: 'coin',
        reward_amount: 100,
        status: 'pending'
      },
      {
        id: 3,
        title: '户外运动30分钟',
        description: '跳绳、跑步或球类运动',
        reward_type: 'coin',
        reward_amount: 80,
        status: 'pending'
      },
      {
        id: 4,
        title: '阅读课外书',
        description: '每天阅读至少20分钟',
        reward_type: 'diamond',
        reward_amount: 3,
        status: 'completed'
      }
    ];

    // 模拟奖励数据
    const mockRewards: Reward[] = [
      {
        id: 1,
        name: '游戏时间',
        description: '30分钟电子游戏时间',
        cost_type: 'diamond',
        cost_amount: 10,
        icon: '🎮'
      },
      {
        id: 2,
        name: '新玩具',
        description: '选择一个喜欢的玩具',
        cost_type: 'diamond',
        cost_amount: 50,
        icon: '🧸'
      },
      {
        id: 3,
        name: '披萨晚餐',
        description: '外出吃披萨晚餐',
        cost_type: 'diamond',
        cost_amount: 30,
        icon: '🍕'
      },
      {
        id: 4,
        name: '神秘盲盒',
        description: '随机奖励',
        cost_type: 'diamond',
        cost_amount: 15,
        icon: '🎁'
      }
    ];

    setUserData(mockUser);
    setTasks(mockTasks);
    setRewards(mockRewards);
  }

  // 显示自定义弹窗
  const showCustomModal = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info'): void => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalShow(true);
  };

  // 任务完成函数 - 添加持久化存储
  async function handleCompleteTask(taskId: number | string): Promise<void> {
    if (!userData || !userData.userId) {
      return;
    }
    
    // 找到要完成的任务
    const taskToComplete = tasks.find(task => task.id === taskId);
    if (!taskToComplete) return;
    
    // 更新本地状态
    var updatedTasks = tasks.map(function(task: Task): Task {
      if (task.id === taskId) {
        return Object.assign({}, task, { 
          status: 'completed',
          needs_approval: true,
          approval_status: 'pending'
        });
      }
      return task;
    });
    
    setTasks(updatedTasks);
    
    // 不再立即更新用户积分
    
    // 保存任务状态到localStorage作为备份
    localStorage.setItem('tasks_' + userData.userId, JSON.stringify(updatedTasks));
    
    try {
      // 尝试调用API保存到后端
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData.userId,
          task_id: taskId,
          status: 'completed',
          action: 'complete'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // 显示审核提示
        showCustomModal(
          '任务提交成功！',
          `${data.message || '任务已成功提交'}，${data.reward_amount} ${data.reward_type === 'coin' ? '金币' : '钻石'}将在管理员确认后到账`,
          'success'
        );
      } else {
        console.error('保存任务状态失败:', await response.text());
        showCustomModal(
          '任务提交成功！',
          '任务提交成功，等待管理员审核！',
          'success'
        );
      }
    } catch (error) {
      console.error('API调用失败:', error);
      showCustomModal(
        '任务提交成功！',
        '任务提交成功，等待管理员审核！',
        'success'
      );
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
            <CartIcon size={60} className="text-purple-500 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
      </div>
    );
  }

  // 确保安全访问数据
  const safeUserData: UserData = userData || {
    username: '',
    userId: 0,
    points: {
      coins: 0,
      diamonds: 0,
      energy: 0,
      level: 1,
      streak_days: 0
    }
  };
  
  // 确保tasks是数组
  var safeTasks: Task[] = Array.isArray(tasks) ? tasks : [];
  var safeRewards: Reward[] = Array.isArray(rewards) ? rewards : [];
  
  // 首页今日任务排序 - 与任务页面保持一致
  var sortedTasks = [...safeTasks].sort((a: Task, b: Task) => {
    // 首先按照任务状态排序：pending > completed > missed
    const statusOrder: Record<string, number> = { 'pending': 0, 'completed': 1, 'missed': 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    
    // 对于相同状态的任务，假设ID越大表示任务越新，所以降序排列
    return typeof a.id === 'number' && typeof b.id === 'number' ? b.id - a.id : 0;
  });
  
  var completedTasks = safeTasks.filter(function(t: Task) { return t.status === 'completed'; });
  var progress = safeTasks.length > 0 ? Math.round((completedTasks.length / safeTasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 font-sans pb-20">
      {/* 顶部导航栏 - 响应式设计 */}
      <header className="bg-white shadow-md py-3 px-4 sm:px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ChickenIcon className="text-yellow-500" size={24} />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">勤奋小鸡</h1>
          </div>
          
          <div className="flex items-center">
            <PointsDisplay onEnergyClick={showLevelModal} />
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8 border-2 border-yellow-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {safeUserData.avatar ? (
                <img 
                  src={safeUserData.avatar} 
                  alt="用户头像" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-300"
                  onError={(e) => {
                    // 头像加载失败时，更新状态并清除本地存储
                    setUserData(prevData => prevData ? { ...prevData, avatar: undefined } : null);
                    const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
                    currentUserData.avatar = undefined;
                    localStorage.setItem('user', JSON.stringify(currentUserData));
                  }}
                />
              ) : (
                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600">{safeUserData.username[0] || '?'}</span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{safeUserData.username || '未知用户'}</h2>
                <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500">等级 {getLevelName(safeUserData.points.energy || 0)}</span>
                  </div>
              </div>
            </div>
            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-medium">
              今日任务进度: {progress}%
            </div>
          </div>
        </div>

        {/* 翻倍效果显示卡片 */}
        <MultiplierDisplay />

        {/* 连胜摘要卡片 - 点击可跳转到完整日历页面 */}
        <StreakSummary 
          streakDays={userData && userData.points ? userData.points.streak_days || 0 : 0}
          isStreakToday={userData && userData.points ? userData.points.is_streak_today || false : false}
          userId={safeUserData.userId ? String(safeUserData.userId) : undefined}
        />

        {/* 任务列表 */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <CalendarIcon className="mr-2 text-purple-600" />
              今日任务
            </h2>
            <button 
              className="text-purple-600 font-medium flex items-center hover:text-purple-800 transition-colors"
              onClick={() => router.push('/tasks')}
            >
              查看全部
              <span className="ml-1">→</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {sortedTasks.map(function(task: Task) {
              // 检查任务是否过期 - 只有未完成的任务才检查过期状态
              const isExpired = task.expiry_time && new Date(task.expiry_time) < new Date() && task.status !== 'completed';
              // 格式化过期时间
              const formatExpiryTime = (expiryTime: string | null | undefined): string => {
                if (!expiryTime) return '';
                const date = new Date(expiryTime);
                return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              };
              
              return (
                <div 
                  key={task.id} 
                  className={
                    task.status === 'completed' 
                      ? 'bg-white rounded-2xl p-5 shadow-md border-l-4 border-green-400 bg-green-50 relative' 
                      : isExpired
                        ? 'bg-white rounded-2xl p-5 shadow-md border-l-4 border-red-400 bg-red-50 relative'
                        : 'bg-white rounded-2xl p-5 shadow-md border-l-4 border-blue-400 hover:shadow-lg transform hover:-translate-y-1 relative'
                  }
                >
                  {/* 缓存数据标记 */}
                  {task._isCachedData && (
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-md transform rotate-12">
                      缓存数据
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                      <p className="text-gray-600 mt-1">{task.description}</p>
                      {task.expiry_time && (
                        <div className={`mt-2 text-sm flex items-center ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                          <CalendarIcon size={14} className="mr-1" />
                          截止时间: {formatExpiryTime(task.expiry_time)}
                        </div>
                      )}
                    </div>
                    <div className={task.reward_type === 'coin' ? 'flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800' : 'flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800'}>
                      {task.reward_type === 'coin' ? (
                          <CartIcon size={16} className="mr-1" />
                        ) : (
                          <DiamondIcon size={16} className="mr-1" />
                        )}
                      {task.reward_amount}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                        {task.status === 'missed' || (isExpired && task.status !== 'completed') ? (
                          <span className="text-red-600 font-medium">✗ 已过期</span>
                        ) : task.approval_status === 'rejected' ? (
                          <span className="text-gray-500 font-medium">✗ 已拒绝</span>
                        ) : task.status === 'completed' && task.approval_status === 'pending' ? (
                          <span className="text-yellow-600 font-medium">⏳ 等待审核</span>
                        ) : task.approval_status === 'approved' || (!task.needs_approval && task.status === 'completed') ? (
                          <span className="text-green-600 font-medium">✓ 已完成</span>
                        ) : task.status === 'pending' ? (
                            <button 
                              className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold px-6 py-2 rounded-full"
                              onClick={function() { handleCompleteTask(task.id); }}
                            >
                              完成任务
                            </button>
                        ) : (
                          <span className="text-gray-500 font-medium">✗ 已拒绝</span>
                        )}
                      </div>
                </div>
                    );
                  })}
          </div>
        </section>

        {/* 推荐奖励 */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <AwardIcon className="mr-2 text-yellow-600" />
              推荐奖励
            </h2>
            <button className="text-purple-600 font-medium flex items-center hover:text-purple-800 transition-colors" onClick={() => router.push('/store')}>
              查看商店
              <span className="ml-1">→</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {safeRewards.slice(0, 8).map(function(reward: Reward) {
              return (
                <div 
                  key={reward.id} 
                  className="bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg transition-all transform hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">{reward.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{reward.name}</h3>
                  <p className="text-xs text-gray-600 mb-3">{reward.description}</p>
                  <div className={reward.cost_type === 'coin' ? 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800' : 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800'}>
                    {reward.cost_type === 'coin' ? (
                    <CartIcon size={12} className="inline mr-1" />
                  ) : (
                    <DiamondIcon size={12} className="inline mr-1" />
                  )}
                    {reward.cost_amount}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 底部导航栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t-2 border-purple-100">
        <div className="grid grid-cols-4 py-3">
          <button className="flex flex-col items-center text-purple-600" onClick={() => router.push('/')}>
            <HomeIcon size={24} />
            <span className="text-xs mt-1 font-medium">首页</span>
          </button>
          <button className="flex flex-col items-center text-gray-400" onClick={() => router.push('/tasks')}>
            <CalendarIcon size={24} />
            <span className="text-xs mt-1">任务</span>
          </button>
          <button className="flex flex-col items-center text-gray-400" onClick={() => router.push('/store')}>
            <StoreIcon size={24} />
            <span className="text-xs mt-1">商店</span>
          </button>
          <button className="flex flex-col items-center text-gray-400" onClick={() => router.push('/profile')}>
            <SettingsIcon size={24} />
            <span className="text-xs mt-1">我的</span>
          </button>
        </div>
      </footer>

      {/* 等级对应关系弹窗 - 不使用Portal */}
      {levelModalShow && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30 transition-opacity duration-300"
          onClick={() => setLevelModalShow(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()} // 防止点击内容关闭弹窗
          >
            {/* 模态框头部 */}
            <div className="bg-blue-50 border-blue-200 text-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">能量等级对应关系</h3>
                <button 
                  onClick={() => setLevelModalShow(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="关闭"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 模态框内容 */}
            <div className="px-6 py-5">
              <div className="mb-4 text-sm text-gray-600">
                您当前能量值: <span className="font-bold text-green-600">{(userData?.points?.energy ?? 0)}</span>，等级: <span className="font-bold text-green-600">{getLevelName(userData?.points?.energy ?? 0)}</span>
              </div>
              <div className="space-y-4">
                <div className={`p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 0 && (userData?.points?.energy ?? 0) <= 29 ? 'ring-2 ring-yellow-400 shadow-md' : ''}`}>
                  <span className="font-medium text-yellow-800">鸡蛋</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">0-29</span>
                    {(userData?.points?.energy ?? 0) >= 0 && (userData?.points?.energy ?? 0) <= 29 && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-green-50 rounded-lg border border-green-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 30 && (userData?.points?.energy ?? 0) <= 69 ? 'ring-2 ring-green-400 shadow-md' : ''}`}>
                  <span className="font-medium text-green-800">鸡宝宝</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">30-69</span>
                    {(userData?.points?.energy ?? 0) >= 30 && (userData?.points?.energy ?? 0) <= 69 && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-orange-50 rounded-lg border border-orange-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 70 && (userData?.points?.energy ?? 0) <= 149 ? 'ring-2 ring-orange-400 shadow-md' : ''}`}>
                  <span className="font-medium text-orange-800">青铜鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">70-149</span>
                    {(userData?.points?.energy ?? 0) >= 70 && (userData?.points?.energy ?? 0) <= 149 && (
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 150 && (userData?.points?.energy ?? 0) <= 249 ? 'ring-2 ring-gray-400 shadow-md' : ''}`}>
                  <span className="font-medium text-gray-800">铁公鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">150-249</span>
                    {(userData?.points?.energy ?? 0) >= 150 && (userData?.points?.energy ?? 0) <= 249 && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 250 && (userData?.points?.energy ?? 0) <= 499 ? 'ring-2 ring-blue-400 shadow-md' : ''}`}>
                  <span className="font-medium text-blue-800">钻石鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">250-499</span>
                    {(userData?.points?.energy ?? 0) >= 250 && (userData?.points?.energy ?? 0) <= 499 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 500 && (userData?.points?.energy ?? 0) <= 999 ? 'ring-2 ring-purple-400 shadow-md' : ''}`}>
                  <span className="font-medium text-purple-800">白金鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">500-999</span>
                    {(userData?.points?.energy ?? 0) >= 500 && (userData?.points?.energy ?? 0) <= 999 && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-red-50 rounded-lg border border-red-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 1000 && (userData?.points?.energy ?? 0) <= 1999 ? 'ring-2 ring-red-400 shadow-md' : ''}`}>
                  <span className="font-medium text-red-800">王者鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">1000-1999</span>
                    {(userData?.points?.energy ?? 0) >= 1000 && (userData?.points?.energy ?? 0) <= 1999 && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex justify-between items-center ${(userData?.points?.energy ?? 0) >= 2000 ? 'ring-2 ring-indigo-400 shadow-md' : ''}`}>
                  <span className="font-medium text-indigo-800">霸道鸡</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">2000+</span>
                    {(userData?.points?.energy ?? 0) >= 2000 && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-bold">当前</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 模态框底部 */}
            <div className="px-6 py-4 bg-gray-50 flex justify-center">
              <button
                onClick={() => setLevelModalShow(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded px-6 py-2"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义模态框 */}
      <CustomModal
        show={modalShow}
        onClose={() => setModalShow(false)}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
      />
      
      {/* 底部导航栏 */}
      <BottomNavigation activePage="home" />
    </div>
  );
}