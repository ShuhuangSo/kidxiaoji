'use client'
import React, { useState, useEffect, useMemo } from 'react';
import CustomModal from './CustomModal';
import Link from 'next/link';
import { StreakGoals } from './StreakGoals';
interface StreakCalendarProps {
  streakDays: number;
  lastStreakDate?: string;
  frozenDays?: number;
  isStreakToday?: boolean;
  userId?: string; // 添加用户ID属性，用于获取连胜日期
  registrationDate?: string; // 添加用户注册日期属性
}

// 辅助函数：获取UTC格式的日期字符串 (YYYY-MM-DD)
const getUTCDateString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 辅助函数：获取北京时间格式的日期字符串 (YYYY-MM-DD)
const getBeijingDateString = (date: Date): string => {
  // 转换为北京时间（UTC+8）
  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DateReward {
  id: number;
  date: string;
  reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
  reward_amount?: number;
  product_id?: number;
  product_name?: string;
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({
  streakDays,
  lastStreakDate,
  frozenDays = 0,
  isStreakToday = false,
  userId, // 接收用户ID
  registrationDate // 接收用户注册日期
}) => {
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

  interface DateReward {
    id: number;
    date: string;
    reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
    reward_amount?: number;
    product_id?: number;
    product_name?: string;
  }

  // 定义今天的日期
    const today = new Date();
    
    // 日期奖励相关状态
    const [dateRewards, setDateRewards] = useState<DateReward[]>([]);
    const [dateRewardsMap, setDateRewardsMap] = useState<Map<string, DateReward>>(new Map());
    
    // 获取日期奖励数据
    const fetchDateRewards = async () => {
      try {
        const response = await fetch('/api/streak-rewards/date');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.rewards)) {
          setDateRewards(data.rewards);
          
          // 创建日期到奖励的映射，使用北京时间格式
          const rewardsMap = new Map<string, DateReward>();
          data.rewards.forEach((reward: any) => {
            const rewardDate = new Date(reward.date);
            const beijingDateStr = getBeijingDateString(rewardDate);
            rewardsMap.set(beijingDateStr, reward);
          });
          setDateRewardsMap(rewardsMap);
          console.log('奖励日期映射已创建，使用北京时间格式:', Array.from(rewardsMap.keys()));
        }
      } catch (error) {
        console.error('获取日期奖励失败:', error);
      }
    };
    
    // 组件挂载时获取日期奖励数据
    useEffect(() => {
      fetchDateRewards();
    }, []);
    
    // 获取奖励图标 - 所有奖励都显示为同一个图标，增加神秘感
    const getRewardIcon = (rewardType: string) => {
      return '🎁';
    };
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    // 默认显示包含连胜日期的月份
    if (lastStreakDate) {
      const streakDate = new Date(lastStreakDate);
      // 使用UTC方法确保时区一致性
      return new Date(streakDate.getUTCFullYear(), streakDate.getUTCMonth(), 1);
    }
    return new Date();
  });
  
  // 连胜日期状态
  const [streakDatesIso, setStreakDatesIso] = useState<Set<string>>(new Set());
  // 新增：非连胜日状态
  const [missedDatesIso, setMissedDatesIso] = useState<Set<string>>(new Set());
  // 新增：冷冻日状态
  const [frozenDatesIso, setFrozenDatesIso] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [modalShow, setModalShow] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [frozenStreakCount, setFrozenStreakCount] = useState(3); // 设置默认测试值
  
  // 组件挂载时的日志
  useEffect(() => {
    console.log('StreakCalendar组件已挂载');
    console.log('userId:', userId);
    console.log('streakDays:', streakDays);
    console.log('lastStreakDate:', lastStreakDate);
    console.log('registrationDate:', registrationDate);
    
    // 确保userId存在，如果不存在则使用默认值2 (xiaoming)
    if (!userId) {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        // 在实际应用中，这里应该通过props更新或重新渲染组件
        console.log('从localStorage获取userId:', storedUserId);
      } else {
        // 设置默认userId为2 (xiaoming)
        localStorage.setItem('userId', '2');
        console.log('设置默认userId为2');
      }
    }
  }, []);
  
  // 获取用户连胜信息（包括连续非连胜日）
  const [streakInfo, setStreakInfo] = useState({
    consecutiveMissedDays: 0,
    lastStreakDate: null
  });
  

  
  // 获取用户连胜信息和背包激冻数量
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // 并行请求获取用户信息和背包数据
        const [userResponse, backpackResponse] = await Promise.all([
          fetch(`/api/user/${userId}`),
          fetch(`/api/user/${userId}/backpack`)
        ]);
        
        // 处理用户连胜信息
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user) {
            setStreakInfo({
              consecutiveMissedDays: userData.user.consecutive_missed_days || 0,
              lastStreakDate: userData.user.last_streak_date || null
            });
          }
        }
        
        // 处理背包激冻数量 - 使用与useFrozenStreak相同的过滤逻辑
        if (backpackResponse.ok) {
          const backpackData = await backpackResponse.json();
          const frozenStreakItems = backpackData.filter((item: any) => 
            item.status === 'unused' && 
            (item.reward_name?.includes('连胜激冻') || 
             item.reward_name?.includes('连胜') || 
             item.reward_name?.includes('激冻') ||
             item.item_name === '连胜激冻' || 
             item.item_name === 'frozen_streak')
          );
          setFrozenStreakCount(frozenStreakItems.length);
          console.log('获取到的连胜激冻数量:', frozenStreakItems.length);
        }
      } catch (error) {
        console.error('获取用户数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUserData();
    }
  }, [userId]);
  
  // 从API获取连胜日期、非连胜日和冷冻日
  useEffect(() => {
    console.log(`开始获取用户ID ${userId} 的连胜日期、非连胜日和冷冻日`);
    const fetchStreakDates = async () => {
      try {
        setLoading(true);
        const url = `/api/streak-dates?user_id=${userId}`;
        console.log(`发起API请求: ${url}`);
        
        const response = await fetch(url);
        console.log(`API响应状态: ${response.status}`);
        
        const data = await response.json();
        console.log(`API响应数据:`, JSON.stringify(data));
        
        // 只有当API返回成功时才更新状态
        if (data.success) {
          // 更新连胜日期 - 使用北京时间格式
          if (Array.isArray(data.streakDatesIso) && data.streakDatesIso.length > 0) {
            const dateSet = new Set<string>(data.streakDatesIso.map((dateStr: string) => {
              const date = new Date(dateStr);
              return getBeijingDateString(date);
            }));
            console.log(`从API获取到${data.streakDatesIso.length}个连胜日期，转换为北京时间后:`, Array.from(dateSet));
            setStreakDatesIso(dateSet);
          } else {
            setStreakDatesIso(new Set());
          }
          
          // 更新非连胜日 - 使用北京时间格式
          if (Array.isArray(data.missedDatesIso) && data.missedDatesIso.length > 0) {
            const missedSet = new Set<string>(data.missedDatesIso.map((dateStr: string) => {
              const date = new Date(dateStr);
              return getBeijingDateString(date);
            }));
            console.log(`从API获取到${data.missedDatesIso.length}个非连胜日，转换为北京时间后:`, Array.from(missedSet));
            setMissedDatesIso(missedSet);
          } else {
            setMissedDatesIso(new Set());
          }
          
          // 更新冷冻日 - 使用北京时间格式
          if (Array.isArray(data.frozenDatesIso) && data.frozenDatesIso.length > 0) {
            const frozenSet = new Set<string>(data.frozenDatesIso.map((dateStr: string) => {
              const date = new Date(dateStr);
              return getBeijingDateString(date);
            }));
            console.log(`从API获取到${data.frozenDatesIso.length}个冷冻日，转换为北京时间后:`, Array.from(frozenSet));
            setFrozenDatesIso(frozenSet);
          } else {
            setFrozenDatesIso(new Set());
          }
          
          // 更新连胜信息
          if (data.streakInfo) {
            setStreakInfo({
              consecutiveMissedDays: data.streakInfo.consecutive_missed_days || 0,
              lastStreakDate: data.streakInfo.last_streak_date || null
            });
          }
        } else {
          console.log('API返回无数据或失败');
        }
      } catch (error) {
        console.error('获取连胜日期时发生错误:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // 只有在userId存在时才尝试获取数据
    if (userId) {
      fetchStreakDates();
    }
  }, [userId]); // 当userId变化时重新获取

  // 生成日历数据
  const calendarData = useMemo(() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 将注册日期转换为Date对象（如果存在）
      const regDate = registrationDate ? new Date(registrationDate) : null;
      if (regDate) {
        regDate.setHours(0, 0, 0, 0);
      }
      
      console.log(`生成${year}-${month + 1}月的日历`);
      console.log(`当前连胜日期集合大小: ${streakDatesIso.size}`);
      console.log(`当前非连胜日集合大小: ${missedDatesIso.size}`);
      console.log(`当前冷冻日集合大小: ${frozenDatesIso.size}`);
      
      // 直接使用从API获取的冷冻日数据
      const frozenDates = frozenDatesIso;
      
      // 获取当月第一天是星期几
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      // 获取当月的天数
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // 生成日历数据
      const calendar: Array<{ 
        day: number; 
        date: Date; 
        isToday: boolean; 
        hasStreak: boolean; 
        isFrozen: boolean;
        isMissed: boolean; // 新增：是否是非连胜日
        isPastAfterRegistration: boolean; // 是否是注册后的过去日期
      }> = [];
      
      // 添加上个月的数据填充空白
      const prevMonthDays = firstDayOfMonth;
      const daysInPrevMonth = new Date(year, month, 0).getDate();
      
      for (let i = prevMonthDays - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 1, day);
        const dateWithoutTime = new Date(date);
        dateWithoutTime.setHours(0, 0, 0, 0);
        // 使用北京时间格式 YYYY-MM-DD
        const dateStr = getBeijingDateString(dateWithoutTime);
        
        // 检查是否是注册后的过去日期
        const isPastAfterRegistration = regDate && 
          dateWithoutTime >= regDate && 
          dateWithoutTime < today;
        
        calendar.push({
          day,
          date,
          isToday: false,
          hasStreak: streakDatesIso.has(dateStr),
          isFrozen: frozenDates.has(dateStr),
          isMissed: missedDatesIso.has(dateStr), // 新增：检查是否是非连胜日
          isPastAfterRegistration: isPastAfterRegistration || false
        });
      }
      
      // 添加当月的数据
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateWithoutTime = new Date(date);
        dateWithoutTime.setHours(0, 0, 0, 0);
        const isToday = dateWithoutTime.getTime() === today.getTime();
        // 使用北京时间格式 YYYY-MM-DD
        const dateStr = getBeijingDateString(dateWithoutTime);
        
        // 检查是否有连胜
        const hasStreak = streakDatesIso.has(dateStr);
        
        // 检查是否是被冻结的日期
        const isFrozen = frozenDates.has(dateStr);
        
        // 调试日志
        if (isFrozen) {
          console.log(`日期${dateStr}被标记为冷冻日`);
        }
        
        // 新增：检查是否是非连胜日
        const isMissed = missedDatesIso.has(dateStr);
        
        // 检查是否是注册后的过去日期
        const isPastAfterRegistration = regDate && 
          dateWithoutTime >= regDate && 
          dateWithoutTime < today;
        
        calendar.push({
          day,
          date,
          isToday,
          hasStreak,
          isFrozen,
          isMissed, // 新增：非连胜日状态
          isPastAfterRegistration: isPastAfterRegistration || false
        });
      }
      
      // 添加下个月的数据填充空白，使日历显示完整的6行7列
      const remainingDays = 42 - calendar.length; // 6行7列
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        const dateWithoutTime = new Date(date);
        dateWithoutTime.setHours(0, 0, 0, 0);
        // 使用北京时间格式 YYYY-MM-DD
        const dateStr = getBeijingDateString(dateWithoutTime);
        
        // 检查是否是注册后的过去日期
        const isPastAfterRegistration = regDate && 
          dateWithoutTime >= regDate && 
          dateWithoutTime < today;
        
        calendar.push({
          day,
          date,
          isToday: false,
          hasStreak: streakDatesIso.has(dateStr),
          isFrozen: frozenDates.has(dateStr),
          isMissed: missedDatesIso.has(dateStr), // 新增：非连胜日状态
          isPastAfterRegistration: isPastAfterRegistration || false
        });
      }
      
      return calendar;
    }, [currentMonth, registrationDate, streakDatesIso, missedDatesIso, frozenDatesIso]);

  // 月份名称
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  // 计算当前月份的连胜日天数（不含冷冻日）
  const currentMonthStreakDays = useMemo(() => {
    // 筛选出当前月份的连胜日（hasStreak为true且isFrozen为false的日期）
    return calendarData.filter(day => {
      const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth();
      return isCurrentMonth && day.hasStreak && !day.isFrozen;
    }).length;
  }, [calendarData, currentMonth]);
  
  // 计算当前月份的冷冻日天数
  const currentMonthFrozenDays = useMemo(() => {
    // 筛选出当前月份的冷冻日（isFrozen为true的日期）
    return calendarData.filter(day => {
      const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth();
      return isCurrentMonth && day.isFrozen;
    }).length;
  }, [calendarData, currentMonth]);
  
  // 处理非连胜日点击事件
  const handleMissedDayClick = (date: Date) => {
    console.log('handleMissedDayClick被调用，日期:', date);
    // 生成日期字符串格式YYYY-MM-DD
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    console.log('设置selectedDate:', dateStr);
    setSelectedDate(dateStr);
    console.log('设置modalShow为true');
    setModalShow(true);
    console.log('当前modalShow状态:', modalShow); // 这里会显示更新前的状态
  };
  
  // 使用连胜激冻，将非连胜日变为冷冻日
  const useFrozenStreak = async () => {
    if (!userId || !selectedDate || frozenStreakCount === 0) return;
    
    try {
      setLoading(true);
      
      // 步骤1: 查找并使用背包中的连胜激冻物品
      const response = await fetch(`/api/user/${userId}/backpack`);
      const items = await response.json();
      
      const frozenStreakItem = items.find((item: any) => 
        item.status === 'unused' && 
        (item.reward_name.includes('连胜激冻') || 
         item.reward_name.includes('连胜') || 
         item.reward_name.includes('激冻'))
      );
      
      if (!frozenStreakItem) {
        console.error('未找到可用的连胜激冻物品');
        return;
      }
      
      // 使用该物品
      await fetch(`/api/user/${userId}/backpack/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: frozenStreakItem.id }),
      });
      
      // 步骤2: 将选定的非连胜日添加为冷冻日，调用API
      const addFrozenDayResponse = await fetch(`/api/user/${userId}/frozen-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate }),
      });
      
      if (!addFrozenDayResponse.ok) {
        const errorData = await addFrozenDayResponse.json();
        console.error('添加冷冻日失败:', errorData.message);
        return;
      }
      
      // 更新前端状态
      const newFrozenDates = new Set(frozenDatesIso);
      newFrozenDates.add(selectedDate);
      setFrozenDatesIso(newFrozenDates);
      
      // 重要：从非连胜日集合中删除该日期，因为它现在是冷冻日
      const newMissedDates = new Set(missedDatesIso);
      newMissedDates.delete(selectedDate);
      setMissedDatesIso(newMissedDates);
      
      // 更新背包中的连胜激冻数量
      setFrozenStreakCount(prev => prev - 1);
      
      // 注意：currentMonthFrozenDays是基于calendarData的计算属性，当frozenDatesIso更新时会自动更新
      
      console.log(`成功将${selectedDate}设置为冷冻日`);
    } catch (error) {
      console.error('使用连胜激冻失败:', error);
    } finally {
      setLoading(false);
      setModalShow(false);
    }
  };
  
  // 切换到上个月
  const goToPrevMonth = () => {
    setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1));
  };
  
  // 切换到下个月
  const goToNextMonth = () => {
    setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1));
  };

  // 星期几的标签
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8">
      {/* 连胜精英俱乐部头部 */}
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
              {!isStreakToday && (
                <Link href="/tasks" className="inline-block mt-2 text-blue-500 font-medium text-sm hover:text-blue-600 transition-colors">
                  <button>延续连胜 →</button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 日历部分 */}
      <div className="p-6">
        {/* 月份选择器 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">{currentMonth.getFullYear()}年{monthNames[currentMonth.getMonth()]}</h3>
          <div className="flex space-x-2">
            <button 
              onClick={goToPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              &lt;
            </button>
            <button 
              onClick={goToNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="flex mb-6 bg-gray-50 rounded-xl p-4">
          <div className="flex-1">
            <div className="flex items-center">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-2">优秀</span>
              <span className="text-lg font-medium text-gray-700">{currentMonthStreakDays}</span>
              <span className="text-sm text-gray-500 ml-1">打卡天数</span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-lg font-medium text-gray-700">{currentMonthFrozenDays}</span>
            <span className="text-sm text-gray-500 ml-1">使用激冻次数</span>
          </div>
        </div>
        
        {/* 日历主体 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 颜色图例说明 */}
          <div className="col-span-7 flex flex-wrap justify-center gap-x-6 gap-y-2 my-3">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs">●</span>
              </div>
              <span className="text-sm text-gray-600">连胜日</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs">●</span>
              </div>
              <span className="text-sm text-gray-600">冷冻日</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                <span className="text-gray-700 text-xs">●</span>
              </div>
              <span className="text-sm text-gray-600">非连胜日</span>
            </div>
            <div className="flex items-center">
              <span className="text-lg mr-2">🎁</span>
              <span className="text-sm text-gray-600">神秘奖励</span>
            </div>
          </div>
          
          {/* 星期几标签 */}
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className="text-center py-2 text-sm font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
          
          {/* 日历日期 */}
        {calendarData.map((day, index) => {
          // 判断是否是当前月份的日期
          const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth();
          
          // 添加详细调试信息
          const dateStr = day.date.toISOString().split('T')[0];
          const canClick = day.isMissed && !day.isFrozen && day.isPastAfterRegistration;
          console.log(`渲染日历单元格: 日期=${dateStr}, 是否当前月=${isCurrentMonth}, 是否连胜=${day.hasStreak}, 是否冷冻=${day.isFrozen}, 是否非连胜=${day.isMissed}, 是否注册后过去日期=${day.isPastAfterRegistration}, 是否可点击=${canClick}`);
          
          // 渲染逻辑
          return (
            <div 
              key={index} 
              className={`relative aspect-square flex flex-col items-center justify-center rounded-full transition-colors ${day.isToday ? 'bg-orange-50' : ''}`}
            >
              {/* 添加奖励图标 - 显示在日期上方 */}
              {(() => {
                const dateStr = getBeijingDateString(day.date);
                const reward = dateRewardsMap.get(dateStr);
                if (reward) {
                  return (
                    <div className="absolute -top-1">
                      <span 
                        className="text-lg" 
                        title={`${reward.reward_type === 'product' ? reward.product_name : 
                          `${reward.reward_amount} ${reward.reward_type === 'coins' ? '金币' : 
                            reward.reward_type === 'diamonds' ? '钻石' : '能量'}`}`}
                      >
                        {getRewardIcon(reward.reward_type)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* 连胜日 - 橙色圆圈 */}
              {day.hasStreak && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{day.day}</span>
                  </div>
                </div>
              )}

              {/* 冷冻日 - 蓝色圆圈 */}
              {day.isFrozen && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{day.day}</span>
                  </div>
                </div>
              )}

              {/* 非连胜日 - 灰色圆圈 */}
              {day.isMissed && (
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded-full border-2 border-dashed border-yellow-400"
                  onClick={() => handleMissedDayClick(day.date)}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                    <span className="text-gray-700 font-medium">{day.day}</span>
                  </div>
                </div>
              )}

              {/* 普通日期 */}
              {!day.hasStreak && !day.isFrozen && !day.isMissed && (
                <span 
                  className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-800' : 'text-gray-300'} ${day.isToday ? 'text-orange-600' : ''}`}
                >
                  {day.day}
                </span>
              )}

              {/* 今天的特殊标记 */}
              {day.isToday && !day.hasStreak && !day.isFrozen && !day.isMissed && (
                <div className="absolute -bottom-1 w-12 h-1 bg-orange-400 rounded-full"></div>
              )}
            </div>
            );
        })}
        </div>
      </div>
    
    {/* 连胜激冻确认弹窗 */}
    <CustomModal
        show={modalShow}
        title="使用连胜激冻"
        message={`确定要使用连胜激冻将${selectedDate}变为冷冻日吗？\n当前背包剩余连胜激冻数量：${frozenStreakCount}`}
        confirmText="确认使用"
        onConfirm={useFrozenStreak}
        onClose={() => setModalShow(false)}
        type="warning"
        disabled={frozenStreakCount === 0}
        icon={<span className="text-4xl">🧊</span>}
        secondaryButtonText={frozenStreakCount === 0 ? "去商店兑换" : undefined}
        onSecondaryButtonClick={() => {
          window.location.href = '/store';
        }}
      />
    </div>
  );
};

export default StreakCalendar;