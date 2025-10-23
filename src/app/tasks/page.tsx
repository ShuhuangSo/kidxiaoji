'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, CartIcon, DiamondIcon } from '@/components/icons';
import CustomModal from '../components/CustomModal';
import BottomNavigation from '../components/BottomNavigation';
import PointsDisplay from '../components/PointsDisplay';
interface Points {
  coins: number;
  diamonds: number;
  energy: number;
  level: number;
  streak_days: number;
}

interface UserData {
  username: string;
  userId: number;
  points: Points;
}

interface Task {
  id: number;
  title: string;
  description: string;
  reward_type: 'coin' | 'diamond';
  reward_amount: number;
  status: 'pending' | 'completed' | 'missed';
  category?: string;
  expiry_time?: string | null;
  due_date?: string;
  has_limited_quota?: boolean;
  quota_count?: number;
  is_assigned?: boolean;
  needs_approval?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  _isCachedData?: boolean;
}

export default function TasksPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'missed'>('all');
  const router = useRouter();
  
  // 弹窗相关状态
  const [modalShow, setModalShow] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  // 统一的任务数据获取函数
  const fetchLatestTasks = async (userId: number) => {
    try {
      console.log(`尝试获取用户 ${userId} 的任务数据`);
      
      // 确保user_id不为空且有效
      if (!userId || typeof userId !== 'number' || isNaN(userId)) {
        console.error('用户ID无效，无法获取任务数据');
        setTasks([]);
        return false;
      }
      
      // 添加防缓存参数，确保每次都获取最新数据
      const timestamp = new Date().getTime();
      const tasksResponse = await fetch(`/api/tasks?user_id=${userId}&t=${timestamp}`);
      
      // 记录响应状态
      console.log(`API响应状态: ${tasksResponse.status}`);
      
      // 尝试解析响应
      let tasksData;
      try {
        tasksData = await tasksResponse.json();
        console.log('API响应数据:', tasksData);
      } catch (parseError) {
        console.error('解析API响应失败:', parseError);
        tasksData = [];
      }
      
      if (!tasksResponse.ok) {
        console.error(`API错误: ${tasksResponse.status}, 消息: ${tasksData?.message || '未知错误'}`);
        
        // API失败时，尝试使用localStorage作为后备，但标记为非最新数据
        const storedTasksStr = localStorage.getItem('tasks_' + userId);
        if (storedTasksStr) {
          try {
            const storedTasks = JSON.parse(storedTasksStr);
            const typedTasks = Array.isArray(storedTasks) ? storedTasks.map((task: any) => ({
              ...task,
              status: task.status as 'pending' | 'completed' | 'missed',
              approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
              // 添加标记表示这是缓存数据
              _isCachedData: true
            })) : [];
            setTasks(typedTasks);
            console.log('使用本地存储的任务数据作为后备，共', typedTasks.length, '个任务');
          } catch (parseError) {
            console.error('解析本地存储数据失败:', parseError);
            setTasks([]); // 解析失败时使用空数组
          }
        } else {
          setTasks([]); // 本地存储也没有数据时使用空数组
          console.log('没有可用的本地缓存数据，显示空任务列表');
        }
        return false;
      }
      
      // API调用成功，处理返回的数据
      const typedTasks = Array.isArray(tasksData) ? tasksData.map((task: any) => ({
        ...task,
        status: task.status as 'pending' | 'completed' | 'missed',
        approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
        // 添加标记表示这是最新数据
        _isCachedData: false
      })) : [];
      
      // 始终使用API返回的最新数据，即使是空数组
      setTasks(typedTasks);
      console.log('任务数据更新成功，共', typedTasks.length, '个任务');
      
      // 更新本地存储，增加错误处理
      try {
        // 只存储实际任务数据，不包括标记字段
        const dataToStore = Array.isArray(tasksData) ? tasksData.map((task: any) => {
          const { _isCachedData, ...actualData } = task;
          return actualData;
        }) : tasksData;
        
        localStorage.setItem('tasks_' + userId, JSON.stringify(dataToStore));
        console.log('本地存储更新成功');
      } catch (storageError) {
        console.error('更新本地存储失败:', storageError);
      }
      
      return true;
    } catch (apiError) {
      console.error('API调用异常:', apiError);
      
      // 异常情况下，尝试使用本地存储作为后备
      try {
        const storedTasksStr = localStorage.getItem('tasks_' + userId);
        if (storedTasksStr) {
          try {
            const storedTasks = JSON.parse(storedTasksStr);
            const typedTasks = Array.isArray(storedTasks) ? storedTasks.map((task: any) => ({
              ...task,
              status: task.status as 'pending' | 'completed' | 'missed',
              approval_status: task.approval_status as 'pending' | 'approved' | 'rejected' | undefined,
              _isCachedData: true
            })) : [];
            setTasks(typedTasks);
            console.log('API调用异常，使用本地存储的任务数据作为后备');
          } catch (parseError) {
            console.error('解析本地存储数据失败:', parseError);
            setTasks([]); // 解析失败时使用空数组
          }
        } else {
          setTasks([]); // 本地存储也没有数据时使用空数组
          console.log('没有可用的本地缓存数据，显示空任务列表');
        }
      } catch (localStorageError) {
        console.error('访问本地存储失败:', localStorageError);
        setTasks([]);
      }
      return false;
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
        const user: UserData = JSON.parse(userStr);
        setUserData(user);
        
        // 强制清除本地缓存，确保从API获取最新数据
        localStorage.removeItem('tasks_' + user.userId);
        console.log('清除本地缓存，强制从API获取最新数据');
        
        // 直接调用fetchLatestTasks，它会优先使用API并正确处理后备逻辑
        await fetchLatestTasks(user.userId);
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

  // 增强的定时刷新机制
  useEffect(() => {
    if (!userData?.userId) return;
    
    // 立即执行一次刷新，确保获取最新数据
    const refreshTaskData = async () => {
      console.log('执行任务数据刷新...');
      await fetchLatestTasks(userData.userId);
    };
    
    // 页面加载后立即刷新一次
    refreshTaskData();
    
    // 设置定时器，每15秒刷新一次（缩短刷新间隔提高实时性）
    const refreshInterval = setInterval(refreshTaskData, 15000);
    
    // 监听页面可见性变化，页面重新可见时立即刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('页面重新可见，刷新任务数据...');
        refreshTaskData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 组件卸载时清理定时器和事件监听
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData?.userId]);

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

    // 模拟更多任务数据
    const mockTasks: Task[] = [
      {
        id: 1,
        title: '完成数学作业',
        description: '完成课本第35-36页的练习题',
        reward_type: 'diamond' as const,
        reward_amount: 5,
        status: 'pending' as const,
        category: '学习',
        due_date: '2023-12-15'
      },
      {
        id: 2,
        title: '打扫自己的房间',
        description: '整理床铺、扫地、擦桌子',
        reward_type: 'coin',
        reward_amount: 100,
        status: 'pending',
        category: '家务',
        due_date: '2023-12-15'
      },
      {
        id: 3,
        title: '户外运动30分钟',
        description: '跳绳、跑步或球类运动',
        reward_type: 'coin',
        reward_amount: 80,
        status: 'pending',
        category: '运动',
        due_date: '2023-12-15'
      },
      {
        id: 4,
        title: '阅读课外书',
        description: '每天阅读至少20分钟',
        reward_type: 'diamond',
        reward_amount: 3,
        status: 'completed',
        category: '学习',
        due_date: '2023-12-15'
      },
      {
        id: 5,
        title: '练习钢琴',
        description: '练习钢琴至少30分钟',
        reward_type: 'diamond',
        reward_amount: 4,
        status: 'pending',
        category: '兴趣',
        due_date: '2023-12-16'
      },
      {
        id: 6,
        title: '帮助父母做饭',
        description: '帮助父母做饭',
        reward_type: 'coin',
        reward_amount: 120,
        status: 'completed',
        category: '家务',
        due_date: '2023-12-14'
      },
      {
        id: 7,
        title: '写日记',
        description: '记录今天的心情和有趣的事情',
        reward_type: 'coin',
        reward_amount: 50,
        status: 'pending',
        category: '学习',
        due_date: '2023-12-15'
      },
      {
        id: 8,
        title: '整理书包',
        description: '准备好明天上学需要的所有物品',
        reward_type: 'coin',
        reward_amount: 30,
        status: 'pending',
        category: '生活',
        due_date: '2023-12-15'
      }
    ];

    setUserData(mockUser);
    setTasks(mockTasks);
  }

  // 显示自定义弹窗
  const showCustomModal = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalShow(true);
  };

  // 任务完成函数 - 添加持久化存储和连胜状态更新
  function handleCompleteTask(taskId: number) {
    if (!userData || !userData.userId) {
      console.log('用户数据不存在，无法完成任务');
      return;
    }
    
    // 找到要完成的任务
    const taskToComplete = tasks.find(task => task.id === taskId);
    if (!taskToComplete) {
      console.log('未找到任务ID:', taskId);
      return;
    }
    
    console.log('开始处理任务完成:', taskToComplete.title, '原始能量值:', userData.points.energy);
    
    // 先更新本地状态
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return {
            ...task,
            status: 'completed' as const,
            needs_approval: true,
            approval_status: 'pending' as const
          };
      }
      return task;
    });
    
    // 更新状态
    setTasks(updatedTasks);
    
    // 保存到localStorage
    localStorage.setItem('tasks_' + userData.userId, JSON.stringify(updatedTasks));
    
    // 提前计算能量值，确保即使API失败也能获得能量
    const newEnergyValue = (userData.points.energy || 0) + 1;
    console.log('任务完成后应获得的能量值:', newEnergyValue);
    
    // 检查是否是今天的第一个完成任务，如果是则更新连胜状态
    const today = new Date().toDateString();
    const lastStreakDate = localStorage.getItem('last_streak_date_' + userData.userId);
    let newStreakDays = userData.points.streak_days || 0;
    let streakUpdated = false;
    
    // 如果上次连胜日期不是今天，则更新连胜状态
    if (lastStreakDate !== today) {
      newStreakDays += 1;
      localStorage.setItem('last_streak_date_' + userData.userId, today);
      streakUpdated = true;
      console.log('今天首次完成任务，连胜天数更新为:', newStreakDays);
    }
    
    // 立即更新本地用户数据，增加额外的1个能量，同时更新连胜状态
    const updatedUserData = {
      ...userData,
      points: {
        ...userData.points,
        energy: newEnergyValue,
        streak_days: newStreakDays
      }
    };
    setUserData(updatedUserData);
    localStorage.setItem('user', JSON.stringify(updatedUserData));
    
    // 创建能量奖励记录并添加到本地存储
    createEnergyRewardRecord(taskId, taskToComplete.title);
    
    // 如果连胜状态更新了，创建连胜奖励记录
    if (streakUpdated) {
      createStreakRewardRecord(newStreakDays);
    }
    
    // 调用API
    fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task_id: taskId,
        user_id: userData.userId,
        action: 'complete',
        // 添加额外的标记，表示需要额外奖励能量
        add_energy_reward: true
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('API响应:', data);
      if (data.success || data.message?.includes('任务完成成功')) {
        // API调用成功，使用API返回的数据更新
        const apiUpdatedTasks = tasks.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
            status: 'completed' as const,
            needs_approval: data.needs_approval ?? true,
            approval_status: (data.approval_status ?? 'pending') as 'pending' | 'approved' | 'rejected'
            };
          }
          return task;
        });
        
        setTasks(apiUpdatedTasks);
        localStorage.setItem('tasks_' + userData.userId, JSON.stringify(apiUpdatedTasks));
        
        // 如果API返回了points数据，则使用它，特别注意更新连胜状态
        if (data.points) {
          // 确保能量值至少是我们已经计算的newEnergyValue
          const finalEnergyValue = Math.max(data.points.energy || 0, newEnergyValue);
          
          // 优先使用API返回的连胜状态，如果有更新则同步更新last_streak_date
          const finalStreakDays = data.points.streak_days || newStreakDays;
          if (data.points.streak_days && data.points.streak_days > (userData.points.streak_days || 0)) {
            localStorage.setItem('last_streak_date_' + userData.userId, new Date().toDateString());
            console.log('API返回更新后的连胜天数:', finalStreakDays);
          }
          
          const finalUserData = {
            ...updatedUserData,
            points: {
              ...data.points,
              energy: finalEnergyValue,
              streak_days: finalStreakDays
            }
          };
          
          setUserData(finalUserData);
          localStorage.setItem('user', JSON.stringify(finalUserData));
          console.log('使用API返回的数据更新用户信息，最终能量值:', finalEnergyValue, '最终连胜天数:', finalStreakDays);
        }
        
        // 显示提示
        if (data.needs_approval) {
          showCustomModal(
            '任务提交成功！',
            `${data.message || '任务已成功提交'}，${data.reward_amount || taskToComplete.reward_amount} ${data.reward_type === 'coin' || taskToComplete.reward_type === 'coin' ? '金币' : '钻石'}将在管理员确认后到账，额外奖励1个能量`,
            'success'
          );
        } else {
          showCustomModal('任务完成成功！', `恭喜你获得了奖励！额外奖励1个能量`, 'success');
        }
      } else {
        console.log('API调用失败，但已在本地添加能量奖励');
        showCustomModal(
          '操作失败',
          data.error || data.message || '完成任务失败',
          'error'
        );
      }
    })
    .catch(error => {
      console.error('完成任务失败:', error);
      console.log('网络错误，但已在本地添加能量奖励');
      
      showCustomModal(
        '任务提交成功！',
        '任务提交成功，等待管理员审核！额外奖励1个能量',
        'success'
      );
    });
  }
  
  // 创建能量奖励记录并添加到本地存储
  function createEnergyRewardRecord(taskId: number, taskTitle: string) {
    if (!userData) {
      console.log('用户数据不存在，无法创建能量奖励记录');
      return;
    }
    
    const energyRewardRecord = {
      id: Date.now(), // 使用时间戳作为临时ID
      point_type: 'energy',
      change_amount: 1,
      balance_after: (userData.points.energy || 0) + 1,
      reason: `完成任务额外奖励: ${taskTitle}`,
      created_at: new Date().toISOString()
    };
    
    console.log('创建能量奖励记录:', energyRewardRecord);
    
    // 从localStorage获取现有的积分记录
    const existingRecordsStr = localStorage.getItem(`point_history_${userData.userId}`);
    let existingRecords = [];
    
    if (existingRecordsStr) {
      try {
        existingRecords = JSON.parse(existingRecordsStr);
        if (!Array.isArray(existingRecords)) {
          existingRecords = [];
        }
      } catch (e) {
        console.error('解析积分记录失败:', e);
        existingRecords = [];
      }
    }
    
    // 添加新记录到数组开头
    existingRecords.unshift(energyRewardRecord);
    
    // 保存回localStorage
    localStorage.setItem(`point_history_${userData.userId}`, JSON.stringify(existingRecords));
    console.log('能量奖励记录已保存到localStorage');
  }
  
  // 创建连胜奖励记录并添加到本地存储
  function createStreakRewardRecord(newStreakDays: number) {
    if (!userData) {
      console.log('用户数据不存在，无法创建连胜奖励记录');
      return;
    }
    
    const streakRewardRecord = {
      id: Date.now() + 1, // 使用时间戳+1作为临时ID
      point_type: 'streak',
      change_amount: 1,
      balance_after: newStreakDays,
      reason: `连续打卡${newStreakDays}天`,
      created_at: new Date().toISOString()
    };
    
    console.log('创建连胜奖励记录:', streakRewardRecord);
    
    // 从localStorage获取现有的积分记录
    const existingRecordsStr = localStorage.getItem(`point_history_${userData.userId}`);
    let existingRecords = [];
    
    if (existingRecordsStr) {
      try {
        existingRecords = JSON.parse(existingRecordsStr);
        if (!Array.isArray(existingRecords)) {
          existingRecords = [];
        }
      } catch (e) {
        console.error('解析积分记录失败:', e);
        existingRecords = [];
      }
    }
    
    // 添加新记录到数组开头
    existingRecords.unshift(streakRewardRecord);
    
    // 保存回localStorage
    localStorage.setItem(`point_history_${userData.userId}`, JSON.stringify(existingRecords));
    console.log('连胜奖励记录已保存到localStorage');
  }



  // 筛选任务
  const filteredTasks = tasks.filter((task: Task) => {
    // 基础过滤条件
    let baseFilter = true;
    
    if (filter === 'pending') {
      baseFilter = task.status === 'pending';
    } else if (filter === 'completed') {
      baseFilter = task.status === 'completed';
    } else if (filter === 'missed') {
      baseFilter = task.status === 'missed';
    } else {
      // 全部任务，但需要过滤掉今天之前已过期的未完成任务
      if (task.status === 'pending' && task.expiry_time) {
        const now = new Date();
        const expiryDate = new Date(task.expiry_time);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];
        
        // 过滤掉今天之前已过期的任务
        if (expiryDate < now && expiryDateStr !== todayStr) {
          baseFilter = false;
        }
      }
    }
    
    return baseFilter;
  });
  
  // 排序任务：1. 未完成任务排在前面 2. 相同状态下，新任务排在上面
  filteredTasks.sort((a, b) => {
    // 首先按照任务状态排序：pending > completed > missed
    const statusOrder = { 'pending': 0, 'completed': 1, 'missed': 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    
    // 对于相同状态的任务，假设ID越大表示任务越新，所以降序排列
    return b.id - a.id;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CalendarIcon size={60} className="text-purple-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 font-sans pb-20">
      {/* 顶部导航栏 - 响应式设计 */}
      <header className="bg-white shadow-md py-3 px-4 sm:px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="text-purple-600" size={24} />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">任务中心</h1>
          </div>
          
          {/* 积分显示组件 */}
          {userData && <PointsDisplay points={userData.points} />}
        </div>
      </header>

      {/* 筛选选项 */}
      <div className="bg-white shadow-sm py-3 px-6 mt-2">
        <div className="container mx-auto flex space-x-4">
          <button 
            className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setFilter('all')}
          >
            全部任务
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setFilter('pending')}
          >
            待完成
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setFilter('completed')}
          >
            已完成
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'missed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setFilter('missed')}
          >
            已过期
          </button>
        </div>
      </div>

      <main className="container mx-auto py-8 px-4">
        {/* 任务统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-md border-l-4 border-purple-500">
            <h3 className="text-gray-500 font-medium mb-2">任务总数</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-purple-600">{tasks.length}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md border-l-4 border-blue-500">
            <h3 className="text-gray-500 font-medium mb-2">待完成任务</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-blue-600">{tasks.filter((t: Task) => t.status === 'pending').length}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md border-l-4 border-green-500">
            <h3 className="text-gray-500 font-medium mb-2">完成率</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-green-600">
                {tasks.length > 0 ? Math.round((tasks.filter((t: Task) => t.status === 'completed').length / tasks.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {filter === 'all' && '全部任务'}
            {filter === 'pending' && '待完成任务'}
            {filter === 'completed' && '已完成任务'}
            <span className="ml-2 text-sm font-normal text-gray-500">({filteredTasks.length}个)</span>
          </h2>
          
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-md">
              <CalendarIcon size={60} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无任务</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task: Task) => {
                // 检查任务是否过期 - 只有未完成的任务才会过期
                const isExpired = task.expiry_time && new Date(task.expiry_time) < new Date() && task.status === 'pending';
                // 格式化过期时间
                const formatExpiryTime = (expiryTime?: string | null) => {
                  if (!expiryTime) return null;
                  const date = new Date(expiryTime);
                  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                };
                
                return (
                  <div 
                    key={task.id} 
                    className={
                      task.status === 'completed' 
                        ? 'bg-white rounded-2xl p-5 shadow-md border-l-4 border-green-400 bg-green-50 relative' 
                        : task.status === 'missed'
                          ? 'bg-white rounded-2xl p-5 shadow-md border-l-4 border-red-400 bg-red-50 relative'
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
                        {task.category && (
                          <div className="flex items-center mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full mr-2 ${task.category === '学习' ? 'bg-blue-100 text-blue-800' : task.category === '家务' ? 'bg-green-100 text-green-800' : task.category === '运动' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'}`}>
                              {task.category}
                            </span>
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                        <p className="text-gray-600 mb-3">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {task.expiry_time && (
                            <div className={`flex items-center ${task.status === 'missed' || isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                              <CalendarIcon size={14} className="mr-1" />
                              截止时间: {formatExpiryTime(task.expiry_time)}
                            </div>
                          )}
                          {task.due_date && !task.expiry_time && (
                            <span className="flex items-center text-gray-500">
                              <CalendarIcon size={14} className="mr-1" />
                              {task.due_date}
                            </span>
                          )}
                          <span className={task.reward_type === 'coin' ? 'flex items-center text-yellow-600' : 'flex items-center text-blue-600'}>
                            {task.reward_type === 'coin' ? (
                        <CartIcon size={14} className="mr-1" />
                      ) : (
                        <DiamondIcon size={14} className="mr-1" />
                      )}
                            {task.reward_amount}
                          </span>
                        </div>
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
                            onClick={() => handleCompleteTask(task.id)}
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
          )}
        </section>
      </main>

      {/* 底部导航栏 */}
      <BottomNavigation activePage="calendar" />

      {/* 自定义弹窗组件 */}
      <CustomModal
        show={modalShow}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalShow(false)}
      />
    </div>
  );
}