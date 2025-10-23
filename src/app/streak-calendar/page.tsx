'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChickenIcon } from '@/components/icons';
import StreakCalendar from '@/app/components/StreakCalendar';
import BottomNavigation from '@/app/components/BottomNavigation';
import { StreakGoals } from '@/app/components/StreakGoals';

// 用户数据类型定义
interface UserData {
  userId?: string | number;
  created_at?: string;
  registration_date?: string;
  points?: {
    streak_days?: number;
    last_streak_date?: string;
    frozen_days?: number;
    is_streak_today?: boolean;
  };
}

export default function StreakCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserData = async () => {
      // 先从localStorage获取用户数据
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserData(user);
        } catch (e) {
          console.error('解析用户数据失败:', e);
        }
      }
      setLoading(false);
    };
    
    fetchUserData();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="text-center">
          <ChickenIcon size={60} className="text-purple-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 font-sans pb-20">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-md py-4 px-6">
        <div className="container mx-auto flex items-center">
          <button 
            onClick={() => window.history.back()}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <ChickenIcon className="text-yellow-500" size={28} />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">连胜日历</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {/* 显示完整的连胜日历 */}
        {userData && (
          <StreakCalendar 
            streakDays={userData.points ? userData.points.streak_days || 0 : 0}
            lastStreakDate={userData.points ? userData.points.last_streak_date : undefined}
            frozenDays={userData.points ? userData.points.frozen_days || 0 : 0}
            isStreakToday={userData.points ? userData.points.is_streak_today || false : false}
            userId={String(userData.userId)}
            registrationDate={userData.created_at || userData.registration_date}
          />
        )}
        
        {/* 连胜目标模块 - 移到连胜说明上面 */}
        <div className="mb-8">
          {userData && (
            <StreakGoals currentStreakDays={userData.points ? userData.points.streak_days || 0 : 0} userId={String(userData.userId)} />
          )}
        </div>
        
        {/* 连胜说明 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">连胜说明</h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <span className="text-white font-medium">1</span>
              </div>
              <p className="text-gray-600">连续完成任务可以获得连胜天数，提升等级</p>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600">可以使用激冻功能，在无法完成任务时保持连胜</p>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600">达到特定连胜天数可以解锁特殊奖励和特权</p>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation activePage="calendar" />
    </div>
  );
}