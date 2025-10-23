'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CartIcon, DiamondIcon, BatteryIcon, AwardIcon, SettingsIcon, UserIcon, StarIcon, ChevronRightIcon, ChickenIcon, EyeIcon, EyeOffIcon, UploadIcon } from '@/components/icons';
import { getLevelName } from '@/lib/levelUtils';
import BottomNavigation from '../components/BottomNavigation';
import StreakCalendar from '../components/StreakCalendar';

interface User {
  id: number;
  username: string;
  role: string;
}

interface PointHistoryItem {
  id: number;
  point_type: string;
  change_amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
  from_user_name?: string;
  to_user_name?: string;
}

interface Points {
  coins: number;
  diamonds: number;
  energy: number;
  level: number;
  streak_days: number;
  last_streak_date?: string;
  consecutive_missed_days?: number;
  is_streak_today?: boolean;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon?: string;
  unlocked_at?: string;
}

interface UserData {
  id?: number;
  username: string;
  role?: string;
  points?: Points;
  userId: number;
  achievements: Achievement[];
  created_at?: string;
  registration_date?: string;
  avatar?: string;
}

const ProfilePage = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPointType, setSelectedPointType] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState<number>(10); // 初始显示10条
  const router = useRouter();
  
  // 积分转账相关状态
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferPointType, setTransferPointType] = useState<'coin' | 'diamond'>('coin');
  const [transferAmount, setTransferAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successPointType, setSuccessPointType] = useState<'coin' | 'diamond'>('coin');
  const [successAmount, setSuccessAmount] = useState(0);
  const [successToUser, setSuccessToUser] = useState('');
  
  // 账户设置相关状态
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  // 头像相关状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragPos, setLastDragPos] = useState({ x: 0, y: 0 });
  // 密码可见性控制
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // 用户名修改权限状态
  const [canChangeUsername, setCanChangeUsername] = useState(false);
  // 头像修改权限状态
  const [canChangeAvatar, setCanChangeAvatar] = useState(false);
  
  // 重置显示数量（当切换筛选条件时）
  useEffect(() => {
    setDisplayCount(10);
  }, [selectedPointType]);

  // 获取积分变动历史
  const fetchPointHistory = async (userId: number) => {
    if (!userId) {
      console.log('用户ID不存在，跳过积分历史获取');
      return;
    }
    
    setHistoryLoading(true);
    try {
      console.log(`发送请求获取用户 ${userId} 的积分变动历史`);
      const response = await fetch(`/api/user/${userId}/point-history`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('获取到的积分历史数据:', data.pointHistory);
        setPointHistory(data.pointHistory);
        // 将API返回的积分历史保存到localStorage
        if (data.pointHistory && Array.isArray(data.pointHistory)) {
          localStorage.setItem(`point_history_${userId}`, JSON.stringify(data.pointHistory));
        }
      } else {
        console.error('获取积分历史失败，状态码:', response.status);
        // API失败时尝试从localStorage读取
        loadPointHistoryFromLocalStorage(userId);
      }
    } catch (error) {
      console.error('获取积分历史网络错误:', error);
      // 网络错误时尝试从localStorage读取
      loadPointHistoryFromLocalStorage(userId);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // 从localStorage加载积分历史记录
  const loadPointHistoryFromLocalStorage = (userId: number) => {
    try {
      const storedHistoryStr = localStorage.getItem(`point_history_${userId}`);
      if (storedHistoryStr) {
        const storedHistory = JSON.parse(storedHistoryStr);
        if (Array.isArray(storedHistory)) {
          console.log('从localStorage加载积分历史记录:', storedHistory);
          setPointHistory(storedHistory);
        }
      }
    } catch (e) {
      console.error('从localStorage加载积分历史失败:', e);
    }
  };

  // 过滤积分历史记录并限制显示数量
  const filteredPointHistory = useMemo(() => {
    let filtered = pointHistory;
    if (selectedPointType !== 'all') {
      filtered = pointHistory.filter(item => item.point_type === selectedPointType);
    }
    // 限制显示数量，最多显示30条
    return filtered.slice(0, Math.min(displayCount, 30));
  }, [pointHistory, selectedPointType, displayCount]);

  // 处理查看更多
  const handleLoadMore = () => {
    setDisplayCount(prevCount => Math.min(prevCount + 10, 30));
  };

  // 获取总记录数
  const totalFilteredCount = useMemo(() => {
    if (selectedPointType === 'all') {
      return pointHistory.length;
    }
    return pointHistory.filter(item => item.point_type === selectedPointType).length;
  }, [pointHistory, selectedPointType]);

  // 获取积分类型对应的颜色类
  const getPointTypeColor = (pointType: string): string => {
    switch (pointType) {
      case 'coin':
        return 'bg-yellow-100';
      case 'diamond':
        return 'bg-blue-100';
      case 'energy':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  };

  // 获取积分类型对应的图标
  const getPointTypeIcon = (pointType: string): React.ReactNode => {
    switch (pointType) {
      case 'coin':
        return <CartIcon size={18} className="text-yellow-600" />;
      case 'diamond':
        return <DiamondIcon size={18} className="text-blue-600" />;
      case 'energy':
        return <BatteryIcon size={18} className="text-green-600" />;
      default:
        return null;
    }
  };

  // 获取积分类型的中文名称
  const getPointTypeName = (pointType: string): string => {
    switch (pointType) {
      case 'coin':
        return '金币';
      case 'diamond':
        return '钻石';
      case 'energy':
        return '能量';
      default:
        return '积分';
    }
  };

  // 格式化日期 - 根据日期显示不同格式
  const formatDate = (dateString: string): string => {
    // 数据库存储的是UTC时间，转换为北京时间(UTC+8)
    const utcDate = new Date(dateString);
    const date = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    
    // 获取当前北京时间
    const now = new Date();
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    
    // 获取昨天的北京时间
    const beijingYesterday = new Date(beijingNow);
    beijingYesterday.setDate(beijingNow.getDate() - 1);
    
    // 辅助函数：获取日期字符串 (YYYY-MM-DD)
    const getDateString = (dateObj: Date): string => {
      return dateObj.toISOString().split('T')[0];
    };
    
    // 获取时间部分
    const timeStr = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // 使用24小时制
    });
    
    // 比较日期字符串
    const targetDateStr = getDateString(date);
    const todayStr = getDateString(beijingNow);
    const yesterdayStr = getDateString(beijingYesterday);
    
    // 判断日期类型并返回相应格式
    if (targetDateStr === todayStr) {
      // 今天 - 只显示时间
      return timeStr;
    } else if (targetDateStr === yesterdayStr) {
      // 昨天 - 显示"昨天 时间"
      return `昨天 ${timeStr}`;
    } else {
      // 昨天之前 - 显示"月-日 时间"
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}月${day}日 ${timeStr}`;
    }
  };

  // 将fetchLatestUserData移到组件顶层，使刷新按钮可以调用
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
        
        // 更新localStorage，确保保留头像信息
        const currentUserDataStr = localStorage.getItem('user');
        let currentAvatar = `/api/user/${userId}/avatar`; // 默认使用API路径
        
        if (currentUserDataStr) {
          const currentUser = JSON.parse(currentUserDataStr);
          // 保留现有的头像信息或使用默认API路径
          if (currentUser.avatar) {
            currentAvatar = currentUser.avatar;
          }
        }
        
        const updatedUser = {
          ...latestData,
          userId: latestData.id || latestData.userId,
          achievements: userData?.achievements || [],
          avatar: currentAvatar // 始终保留头像信息
        };
        console.log('准备保存到localStorage的数据:', updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('localStorage更新成功');
        
        // 更新UI显示
        setUserData(updatedUser);
        console.log('UI数据更新成功');
        
        // 获取积分变动历史
        fetchPointHistory(userId);
      } else {
        console.error('获取最新用户数据失败，状态码:', response.status);
      }
    } catch (error) {
      console.error('获取用户数据网络错误:', error);
    }
  };

  // 获取用户头像
  const fetchAvatar = async (userId: number) => {
    try {
      const response = await fetch(`/api/user/${userId}/avatar`);
      if (response.ok) {
        // 创建Blob URL作为头像地址
        const blob = await response.blob();
        const avatarUrl = URL.createObjectURL(blob);
        
        // 更新localStorage中的用户数据
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          // 保存头像URL到localStorage，使用静态路径而不是临时Blob URL
          // 下次刷新时会重新请求头像
          userData.avatar = `/api/user/${userId}/avatar`;
          localStorage.setItem('user', JSON.stringify(userData));
          setUserData(prev => prev ? { ...prev, avatar: avatarUrl } : null);
        }
      } else {
        // 头像不存在或获取失败，使用默认头像
        console.log('头像不存在，使用默认头像');
        setUserData(prev => prev ? { ...prev, avatar: undefined } : null);
      }
    } catch (error) {
      console.error('获取头像失败:', error);
      // 出错时使用默认头像
      setUserData(prev => prev ? { ...prev, avatar: undefined } : null);
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      const userStr = localStorage.getItem('user');
      console.log('从localStorage读取用户数据:', userStr);
      if (!userStr) {
        router.push('/login');
        return;
      }

      try {
          const user = JSON.parse(userStr);
          console.log('解析后的用户数据:', user);
          // 先显示localStorage中的数据
          setUserData(user);
          
          // 然后从后端获取最新数据
          console.log('调用API获取最新用户数据，用户ID:', user.userId);
          await fetchLatestUserData(user.userId);
          
          // 获取最新头像数据
          console.log('调用API获取最新头像数据，用户ID:', user.userId);
          await fetchAvatar(user.userId);
          
          // 获取积分变动历史
          fetchPointHistory(user.userId);
        } catch (error) {
          console.error('加载用户数据失败:', error);
          // 使用模拟数据
          console.log('使用模拟数据');
          loadMockData();
        } finally {
          setLoading(false);
        }
    };

    checkLoginStatus();
  }, [router]);

  function loadMockData() {
    // 模拟用户数据
    const mockUser = {
      username: '小明',
      userId: 2,
      points: {
        coins: 1250,
        diamonds: 45,
        energy: 85,
        level: 7,
        streak_days: 5,
        last_streak_date: new Date().toISOString(),
        consecutive_missed_days: 1,
        is_streak_today: true
      },
      achievements: [
        { id: 1, name: '勤奋小蜜蜂', description: '连续完成5天任务' },
        { id: 2, name: '学习达人', description: '完成10个学习任务' },
        { id: 3, name: '运动健将', description: '完成8个运动任务' }
      ]
    };

    setUserData(mockUser);
  }
// 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };
  
  // 检查用户是否有权限修改用户名
  const checkUsernameChangePermission = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/${userId}/check-username-permission`);
      if (response.ok) {
        const data = await response.json();
        setCanChangeUsername(data.hasPermission || false);
      } else {
        console.error('检查用户名修改权限失败');
        setCanChangeUsername(false);
      }
    } catch (error) {
      console.error('检查用户名修改权限时出错:', error);
      setCanChangeUsername(false);
    }
  };
  
  // 检查用户是否有权限修改头像
  const checkAvatarChangePermission = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/${userId}/check-avatar-permission`);
      if (response.ok) {
        const data = await response.json();
        setCanChangeAvatar(data.hasPermission || false);
      } else {
        console.error('检查头像修改权限失败');
        setCanChangeAvatar(false);
      }
    } catch (error) {
      console.error('检查头像修改权限时出错:', error);
      setCanChangeAvatar(false);
    }
  };

  // 当用户数据加载完成后，检查权限
  useEffect(() => {
    if (userData?.userId) {
      checkUsernameChangePermission(userData.userId.toString());
      checkAvatarChangePermission(userData.userId.toString());
    }
  }, [userData?.userId]);

  // 处理更新用户名
  const handleUpdateUsername = async () => {
    // 检查是否有权限修改用户名
    if (!canChangeUsername) {
      setUpdateError('您没有权限修改用户名，请先使用改名卡');
      return;
    }

    if (!newUsername.trim()) {
      setUpdateError('用户名不能为空');
      return;
    }
    
    if (newUsername === userData?.username) {
      setUpdateError('新用户名与当前用户名相同');
      return;
    }
    
    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');
    
    try {
      const response = await fetch(`/api/user/${userData?.userId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: newUsername.trim(),
          useChangePermission: true // 标记使用一次改名权限
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUpdateSuccess('用户名更新成功');
        // 更新本地存储的用户信息
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.username = newUsername.trim();
          localStorage.setItem('user', JSON.stringify(user));
        }
        // 更新页面显示的用户名
        setUserData(prev => prev ? { ...prev, username: newUsername.trim() } : null);
        
        // 使用完改名权限后，更新权限状态
        setCanChangeUsername(false);
        
        // 3秒后关闭模态框
        setTimeout(() => {
          setShowUsernameModal(false);
          setNewUsername('');
          setUpdateSuccess('');
        }, 2000);
      } else {
        setUpdateError(result.error || '更新失败，请重试');
      }
    } catch (error) {
      setUpdateError('网络错误，请稍后重试');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // 处理头像上传
  // 处理头像拖拽开始
  const handleImageMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastDragPos({ x: e.clientX, y: e.clientY });
  };
  
  // 处理头像拖拽移动
  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastDragPos.x;
    const deltaY = e.clientY - lastDragPos.y;
    
    setImagePosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastDragPos({ x: e.clientX, y: e.clientY });
  };
  
  // 处理头像拖拽结束
  const handleImageMouseUp = () => {
    setIsDragging(false);
  };
  
  // 处理头像触摸开始
  const handleImageTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastDragPos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };
  
  // 处理头像触摸移动
  const handleImageTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const deltaX = e.touches[0].clientX - lastDragPos.x;
    const deltaY = e.touches[0].clientY - lastDragPos.y;
    
    setImagePosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastDragPos({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    
    // 阻止默认行为以避免滚动
    e.preventDefault();
  };
  
  // 处理头像触摸结束
  const handleImageTouchEnd = () => {
    setIsDragging(false);
  };
  
  const handleAvatarUpload = async () => {
    if (!selectedFile || !userData) return;
    
    // 检查是否有权限修改头像
    if (!canChangeAvatar) {
      setUpdateError('您没有权限修改头像，请先使用改头像卡');
      return;
    }
    
    try {
      setUpdateLoading(true);
      setUpdateError('');
      
      // 首先应用用户的调整（位置和缩放）到图片
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = URL.createObjectURL(selectedFile);
      });
      
      // 设置canvas尺寸（头像尺寸）
      const avatarSize = 200;
      canvas.width = avatarSize;
      canvas.height = avatarSize;
      
      // 计算图片在canvas中的位置和缩放
      if (ctx) {
        // 保存当前状态
        ctx.save();
        
        // 将原点移动到canvas中心
        ctx.translate(avatarSize / 2, avatarSize / 2);
        
        // 应用缩放
        ctx.scale(imageScale, imageScale);
        
        // 应用位置调整
        ctx.translate(imagePosition.x / imageScale, imagePosition.y / imageScale);
        
        // 绘制图片，居中显示
        const drawSize = Math.max(img.width, img.height);
        const scale = avatarSize / drawSize;
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        
        ctx.drawImage(
          img,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
        
        // 恢复状态
        ctx.restore();
      }
      
      // 将canvas转换为blob
      const processedFile = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            // 创建一个新的File对象，保持原文件名和类型
            resolve(new File([blob], selectedFile.name, { type: selectedFile.type }));
          } else {
            // 如果处理失败，使用原始文件
            resolve(selectedFile);
          }
        }, selectedFile.type || 'image/jpeg');
      });
      
      const formData = new FormData();
      formData.append('avatar', processedFile);
      
      const response = await fetch(`/api/user/${userData.userId}/avatar`, {
        method: 'POST',
        body: formData,
        // 移除手动设置的Content-Type，让浏览器自动设置正确的multipart/form-data头（包含boundary）
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 更新localStorage中的用户数据
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          // 保存API路径作为头像URL
          userData.avatar = `/api/user/${userData.userId}/avatar`;
          localStorage.setItem('user', JSON.stringify(userData));
          
          // 立即重新获取头像以更新UI
          await fetchAvatar(userData.userId);
          
          // 使用完头像修改权限后，更新权限状态
          setCanChangeAvatar(false);
        }
        
        setUpdateSuccess('头像上传成功！');
        
        // 3秒后关闭模态框
        setTimeout(() => {
          setShowAvatarModal(false);
          setSelectedFile(null);
          setUpdateSuccess('');
          setImagePosition({ x: 0, y: 0 });
            setImageScale(1);
        }, 2000);
      } else {
        const errorData = await response.json();
        setUpdateError(errorData.message || '上传失败，请稍后重试');
      }
    } catch (error) {
      setUpdateError('网络错误，请稍后重试');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // 处理更新密码
  const handleUpdatePassword = async () => {
    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      setUpdateError('请填写所有密码字段');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setUpdateError('两次输入的新密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      setUpdateError('新密码长度至少为6位');
      return;
    }
    
    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');
    
    try {
      const response = await fetch(`/api/user/${userData?.userId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUpdateSuccess('密码更新成功');
        
        // 3秒后关闭模态框并清空表单
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setUpdateSuccess('');
        }, 2000);
      } else {
        setUpdateError(result.error || '更新失败，请重试');
      }
    } catch (error) {
      setUpdateError('网络错误，请稍后重试');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // 获取非管理员用户列表
  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const users = await response.json();
        // 过滤出非管理员用户，并且排除自己
        const filteredUsers = users.filter((user: User) => 
          user.role !== 'parent' && user.id !== userData?.userId
        );
        setAvailableUsers(filteredUsers);
      } else {
        console.error('获取用户列表失败');
        alert('获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表错误:', error);
      alert('获取用户列表时发生错误');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // 处理积分转账
  const handleTransferPoints = async () => {
    if (!userData || !selectedUser || !transferAmount) {
      alert('请填写完整的转账信息');
      return;
    }
    
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效的转账金额');
      return;
    }
    
    // 检查积分是否足够
    const currentPoints = transferPointType === 'coin' 
      ? userData.points?.coins 
      : userData.points?.diamonds;
    
    if ((currentPoints || 0) < amount) {
      alert('积分不足');
      return;
    }
    
    setTransferLoading(true);
    try {
      const response = await fetch('/api/user/transfer-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: userData.userId,
          toUserId: selectedUser,
          pointType: transferPointType,
          amount: amount
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // 获取目标用户名称
        const toUser = availableUsers.find(u => u.id === selectedUser);
        
        // 显示美化的成功弹窗
        setSuccessMessage(`转账成功！已将${amount}${transferPointType === 'coin' ? '金币' : '钻石'}转给${toUser?.username || '目标用户'}`);
        setSuccessPointType(transferPointType);
        setSuccessAmount(amount);
        setSuccessToUser(toUser?.username || '目标用户');
        setShowSuccessModal(true);
        
        // 关闭转账弹窗
        setShowTransferModal(false);
        
        // 重置表单
        setTransferAmount('');
        setSelectedUser(null);
        
        // 刷新用户数据
        fetchLatestUserData(userData.userId);
        
        // 刷新积分历史
        fetchPointHistory(userData.userId);
      } else {
        const errorData = await response.json();
        alert(errorData.message || '转账失败');
      }
    } catch (error) {
      console.error('转账错误:', error);
      alert('转账时发生错误');
    } finally {
      setTransferLoading(false);
    }
  };
  
  // 打开转账弹窗
  const openTransferModal = async () => {
    // 获取可用用户列表
    await fetchAvailableUsers();
    // 打开弹窗
    setShowTransferModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon size={60} className="text-purple-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 font-sans pb-20">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
      `}</style>
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-md py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ChickenIcon size={28} className="text-yellow-500" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">
              个人中心
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8 border-2 border-yellow-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                  className={`w-20 h-20 bg-purple-200 rounded-full flex items-center justify-center group relative ${canChangeAvatar ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (canChangeAvatar) {
                      setShowAvatarModal(true);
                    }
                  }}
                >
                  {userData?.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt="用户头像" 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        // 头像加载失败时隐藏图片
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // 通过状态更新来显示默认图标
                        setUserData(prev => prev ? { ...prev, avatar: undefined } : null);
                      }}
                    />
                  ) : (
                    <UserIcon size={40} className="text-purple-600 default-avatar-icon" />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 rounded-full flex items-center justify-center">
                    <UploadIcon size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{userData?.username || '未知用户'}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">等级 {userData?.points ? getLevelName(userData.points.energy || 0) : '鸡蛋'}</span>
                </div>
              </div>
            </div>
            {/* 手动刷新按钮 */}
            <button 
              className="bg-purple-100 text-purple-600 p-2 rounded-full hover:bg-purple-200 transition-colors"
              onClick={() => fetchLatestUserData(userData?.userId || 0)}
              disabled={!userData?.userId}
            >
              <SettingsIcon size={20} />
              <span className="ml-1 text-sm">刷新</span>
            </button>
          </div>
        </div>

        {/* 连胜日历已移除，现在有单独的页面显示 */}

        {/* 积分信息 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">我的积分</h3>
            <button 
                  onClick={openTransferModal}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm flex items-center"
                >
                  <StarIcon className="w-4 h-4 mr-1" />
                  转账
                </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-2xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <CartIcon size={28} className="text-yellow-500" />
                </div>
              <p className="text-gray-600 text-sm">金币</p>
              <p className="text-2xl font-bold text-yellow-600">{userData?.points?.coins || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <DiamondIcon size={28} className="text-blue-500" />
              </div>
              <p className="text-gray-600 text-sm">钻石</p>
              <p className="text-2xl font-bold text-blue-600">{userData?.points?.diamonds || 0}</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <BatteryIcon size={28} className="text-green-500" />
              </div>
              <p className="text-gray-600 text-sm">能量</p>
              <p className="text-2xl font-bold text-green-600">{userData?.points?.energy || 0}</p>
            </div>
          </div>
        </div>

        {/* 积分变动历史 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">积分变动记录</h3>
          
          {/* 积分类型筛选器 */}
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedPointType === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => setSelectedPointType('all')}
            >
              全部
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedPointType === 'coin' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => setSelectedPointType('coin')}
            >
              <span className="mr-1">💰</span> 金币
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedPointType === 'diamond' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => setSelectedPointType('diamond')}
            >
              <span className="mr-1">💎</span> 钻石
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedPointType === 'energy' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => setSelectedPointType('energy')}
            >
              <span className="mr-1">⚡</span> 能量
            </button>
          </div>
          
          {/* 积分变动历史列表 */}
          {historyLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPointHistory.length > 0 ? (
                <>
                  {filteredPointHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getPointTypeColor(item.point_type)}`}>
                          {getPointTypeIcon(item.point_type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.reason || `${getPointTypeName(item.point_type)}变动`}</p>
                          {/* 显示转账用户信息 - 完整版 */}
                          {(item.from_user_name || item.to_user_name || 
                            (item.reason?.includes('转账') && item.change_amount < 0) ||
                            (item.reason?.includes('收到') && item.reason?.includes('转账'))) && (
                            <p className="text-sm text-blue-600 mt-1">
                              {item.from_user_name && `来自: ${item.from_user_name}`}
                              {item.to_user_name && `转给: ${item.to_user_name}`}
                              {!item.from_user_name && !item.to_user_name && 
                                item.reason?.includes('转账') && item.change_amount < 0 && 
                                '转账给用户'}
                              {!item.from_user_name && !item.to_user_name && 
                                item.reason?.includes('收到') && item.reason?.includes('转账') && 
                                '收到用户转账'}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      <div className={`font-bold ${item.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change_amount > 0 ? '+' : ''}{item.change_amount} {getPointTypeName(item.point_type)}
                      </div>
                    </div>
                  ))}
                  {/* 查看更多按钮 */}
                  {displayCount < totalFilteredCount && displayCount < 30 && (
                    <div className="text-center py-4">
                      <button
                        onClick={handleLoadMore}
                        className="bg-purple-100 text-purple-600 px-6 py-2 rounded-full font-medium hover:bg-purple-200 transition-colors"
                      >
                        查看更多记录
                      </button>
                    </div>
                  )}
                  {/* 显示已显示全部记录的提示 */}
                  {displayCount >= Math.min(totalFilteredCount, 30) && totalFilteredCount > 10 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-400">已显示全部记录</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-gray-500">暂无积分变动记录</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 成就列表已移除 */}

        {/* 设置选项 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">设置</h3>
          <div className="space-y-3">
            <button 
              className={`w-full flex justify-between items-center p-4 transition-colors ${canChangeAvatar ? 'hover:bg-gray-50' : 'bg-gray-50 cursor-not-allowed'}`}
              onClick={() => {
                if (canChangeAvatar) {
                  setShowAvatarModal(true);
                }
              }}
            >
              <span className={canChangeAvatar ? 'text-gray-800' : 'text-gray-400'}>
                修改头像
                {!canChangeAvatar && ' (需使用改头像卡)'}
              </span>
              <ChevronRightIcon size={20} className={canChangeAvatar ? 'text-gray-400' : 'text-gray-300'} />
            </button>
            <button 
              className={`w-full flex justify-between items-center p-4 rounded-xl transition-colors ${canChangeUsername ? 'hover:bg-gray-50' : 'bg-gray-50 cursor-not-allowed'}`}
              onClick={() => setShowUsernameModal(true)}
              disabled={!canChangeUsername}
            >
              <span className={canChangeUsername ? 'text-gray-800' : 'text-gray-400'}>
                修改用户名
                {!canChangeUsername && ' (需使用改名卡)'}
              </span>
              <ChevronRightIcon size={20} className={canChangeUsername ? 'text-gray-400' : 'text-gray-300'} />
            </button>
            <button 
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 rounded-xl transition-colors"
              onClick={() => setShowPasswordModal(true)}
            >
              <span className="text-gray-800">修改密码</span>
              <ChevronRightIcon size={20} className="text-gray-400" />
            </button>
            <div className="w-full flex justify-between items-center p-4 text-gray-500">
              <span>系统版本v1.0</span>
            </div>
          </div>
        </div>

        {/* 退出登录按钮 */}
        <button 
          className="w-full bg-red-100 text-red-600 font-bold py-4 px-6 rounded-2xl hover:bg-red-200 transition-colors"
          onClick={handleLogout}
        >
          退出登录
        </button>
      </main>

      {/* 底部导航栏 */}
      <BottomNavigation activePage="settings" />
      
      {/* 积分转账弹窗 - 优化版 */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out animate-slideInUp">
            {/* 弹窗头部 */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <StarIcon className="w-6 h-6 mr-2 text-blue-500" />
                  积分转账
                </h2>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6 space-y-6">
              {/* 积分类型选择 - 优化为大按钮样式 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-3">选择积分类型</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTransferPointType('coin')}
                    className={`py-4 px-6 rounded-xl transition-all duration-200 flex flex-col items-center justify-center ${transferPointType === 'coin' 
                      ? 'bg-yellow-100 border-2 border-yellow-500 shadow-md' 
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mb-2">
                      <CartIcon size={20} className="text-white" />
                    </div>
                    <span className="font-medium text-gray-900">金币</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferPointType('diamond')}
                    className={`py-4 px-6 rounded-xl transition-all duration-200 flex flex-col items-center justify-center ${transferPointType === 'diamond' 
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md' 
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                      <DiamondIcon size={20} className="text-white" />
                    </div>
                    <span className="font-medium text-gray-900">钻石</span>
                  </button>
                </div>
              </div>
              
              {/* 选择用户 - 优化为卡片式展示 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-3">选择转账用户</label>
                {loadingUsers ? (
                  <div className="h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-gray-600">加载用户列表中...</span>
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-xl text-center">
                    <p className="text-gray-500">暂无可用用户</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUser(user.id)}
                        className={`p-4 rounded-xl transition-all duration-200 flex items-center justify-center ${selectedUser === user.id ? 'bg-purple-100 border-2 border-purple-500 shadow-md' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                      >
                        <UserIcon size={18} className="text-purple-500 mr-2" />
                        <span className="font-medium text-center text-gray-900">{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 转账金额 - 优化样式 */}
              <div>
                <label className="block text-base font-medium text-gray-900 mb-3">转账金额</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder={`请输入${transferPointType === 'coin' ? '金币' : '钻石'}数量`}
                    className="w-full h-16 px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-xl font-medium focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-900">
                    <span className="font-medium">当前余额:</span> 
                    <span className={`text-xl font-bold ml-2 ${transferPointType === 'coin' ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {transferPointType === 'coin' 
                        ? userData?.points?.coins || 0 
                        : userData?.points?.diamonds || 0
                      }
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* 弹窗底部按钮区域 */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferAmount('');
                    setSelectedUser(null);
                  }}
                  className="flex-1 h-14 px-6 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
                  disabled={transferLoading}
                >
                  取消
                </button>
                <button
                  onClick={handleTransferPoints}
                  className={`flex-1 h-14 px-6 py-3 rounded-xl text-base font-medium focus:outline-none focus:ring-3 focus:ring-offset-2 transition-colors flex items-center justify-center ${transferPointType === 'coin' 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'}`}
                  disabled={transferLoading}
                >
                  {transferLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      转账中...
                    </>
                  ) : (
                    '确认转账'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 修改头像模态框 */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all duration-300 ease-out animate-slideInUp">
            {/* 弹窗头部 */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">修改头像</h2>
              <button 
                onClick={() => {
                  setShowAvatarModal(false);
                  setSelectedFile(null);
                  setUpdateError('');
                  setUpdateSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-purple-200 rounded-full flex items-center justify-center mb-4">
                  {selectedFile ? (
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="预览头像" 
                        className="absolute w-full h-full object-cover transform transition-transform duration-0"
                        style={{
                          transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                          touchAction: 'none'
                        }}
                        onMouseDown={handleImageMouseDown}
                        onMouseMove={handleImageMouseMove}
                        onMouseUp={handleImageMouseUp}
                        onMouseLeave={handleImageMouseUp}
                        onTouchStart={handleImageTouchStart}
                        onTouchMove={handleImageTouchMove}
                        onTouchEnd={handleImageTouchEnd}
                      />
                    </div>
                  ) : userData?.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt="当前头像" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserIcon size={48} className="text-purple-600" />
                  )}
                </div>
                
                <label 
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl flex items-center space-x-2 cursor-pointer hover:bg-purple-700 transition-colors"
                >
                  <UploadIcon size={20} />
                  <span>{selectedFile ? '更换图片' : '选择图片'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setUpdateError('');
                      }
                    }}
                  />
                </label>
                
                {selectedFile && (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-gray-600">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center justify-center mt-4 gap-4">
                      <button 
                        className="flex items-center text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        onClick={() => setImageScale(prev => Math.min(prev + 0.1, 3))}
                      >
                        + 放大
                      </button>
                      <button 
                        className="flex items-center text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        onClick={() => setImageScale(prev => Math.max(prev - 0.1, 0.5))}
                      >
                        - 缩小
                      </button>
                      <button 
                        className="flex items-center text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        onClick={() => {
                          setImagePosition({ x: 0, y: 0 });
                          setImageScale(1);
                        }}
                      >
                        重置
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      提示: 您可以在预览框内拖拽图片调整位置
                    </p>
                  </div>
                )}
              </div>
              
              {updateError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                  {updateError}
                </div>
              )}
              
              {!canChangeAvatar && (
                <div className="bg-yellow-50 text-yellow-600 p-3 rounded-lg text-sm">
                  提示：修改头像需要先在背包中使用"改头像卡"商品
                </div>
              )}
              
              <div className="mt-2 text-sm text-gray-600">
                调整说明:
                <ul className="list-disc list-inside mt-1 text-gray-500">
                  <li>在头像框内拖拽图片调整位置</li>
                  <li>使用放大/缩小按钮调整图片大小</li>
                  <li>支持触屏操作，可滑动调整位置</li>
                </ul>
              </div>
              
              {updateSuccess && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg">
                  {updateSuccess}
                </div>
              )}
            </div>
            
            {/* 弹窗底部按钮区域 */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowAvatarModal(false);
                    setSelectedFile(null);
                    setUpdateError('');
                    setUpdateSuccess('');
                  }}
                  className="flex-1 h-12 px-6 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
                  disabled={updateLoading}
                >
                  取消
                </button>
                <button
                  onClick={handleAvatarUpload}
                  className="flex-1 h-12 px-6 py-3 rounded-xl text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-purple-500 transition-colors flex items-center justify-center"
                  disabled={updateLoading || !selectedFile}
                >
                  {updateLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      上传中...
                    </>
                  ) : (
                    '确认上传'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 转账成功弹窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full transform transition-all duration-300 ease-out animate-slideInUp">
            {/* 弹窗内容 */}
            <div className="p-8 text-center">
              {/* 成功图标 */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* 成功标题 */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">转账成功</h3>
              
              {/* 成功信息 */}
              <p className="text-gray-600 mb-6">
                {successAmount} {successPointType === 'coin' ? '金币' : '钻石'} 已成功转账给 <span className="text-purple-600 font-medium">{successToUser}</span>
              </p>
              
              {/* 积分图标 */}
              <div className={`w-12 h-12 ${successPointType === 'coin' ? 'bg-yellow-500' : 'bg-blue-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                {successPointType === 'coin' ? (
                  <CartIcon size={24} className="text-white" />
                ) : (
                  <DiamondIcon size={24} className="text-white" />
                )}
              </div>
              
              {/* 确认按钮 */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className={`w-full h-14 px-6 py-3 rounded-xl text-white font-medium focus:outline-none focus:ring-3 focus:ring-offset-2 transition-colors flex items-center justify-center ${successPointType === 'coin' 
                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 修改用户名模态框 */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all duration-300 ease-out animate-slideInUp">
            {/* 弹窗头部 */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">修改用户名</h2>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">当前用户名</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {userData?.username}
                </div>
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">新用户名</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="请输入新用户名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  maxLength={20}
                />
              </div>
              
              {updateError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                  {updateError}
                </div>
              )}
              
              {updateSuccess && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg">
                  {updateSuccess}
                </div>
              )}
            </div>
            
            {/* 弹窗底部按钮区域 */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowUsernameModal(false);
                    setNewUsername('');
                    setUpdateError('');
                    setUpdateSuccess('');
                  }}
                  className="flex-1 h-12 px-6 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
                  disabled={updateLoading}
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateUsername}
                  className="flex-1 h-12 px-6 py-3 rounded-xl text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      更新中...
                    </>
                  ) : (
                    '确认更新'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 修改密码模态框 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all duration-300 ease-out animate-slideInUp">
            {/* 弹窗头部 */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">修改密码</h2>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">当前密码</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="请输入当前密码"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">新密码</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码（至少6位）"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">确认新密码</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
              </div>
              
              {updateError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                  {updateError}
                </div>
              )}
              
              {updateSuccess && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg">
                  {updateSuccess}
                </div>
              )}
            </div>
            
            {/* 弹窗底部按钮区域 */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setUpdateError('');
                    setUpdateSuccess('');
                  }}
                  className="flex-1 h-12 px-6 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
                  disabled={updateLoading}
                >
                  取消
                </button>
                <button
                  onClick={handleUpdatePassword}
                  className="flex-1 h-12 px-6 py-3 rounded-xl text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      更新中...
                    </>
                  ) : (
                    '确认更新'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;