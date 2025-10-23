'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Calendar, Check, Home, RotateCcw, Settings, Store, Users, X, Gift, ChevronDown, ChevronRight } from 'lucide-react';
import { getLevelName } from '@/lib/levelUtils';

// 导入Tab组件
import StreakRewardsTab from './components/StreakRewardsTab';
import StreakDatesTab from './components/StreakDatesTab';
import LuckyBoxTab from './components/LuckyBoxTab';
import SystemSettingsTab from './components/SystemSettingsTab';


// 定义类型

// 类型定义
interface Points {
  coins: number;
  diamonds: number;
  energy: number;
  level: number;
  streak_days: number;
}

interface User {
  id: number;
  username: string;
  role: 'parent' | 'child';
  created_at?: string;
  points: Points;
  tasks?: Task[];
}

interface Task {
  id: number;
  title: string;
  description: string;
  reward_type: 'coin' | 'diamond';
  reward_amount: number;
  is_daily: boolean;
  status?: 'completed' | 'pending';
  completed_at?: string | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  expiry_time?: string | null;
  target_user_id?: number | null;
  target_username?: string;
  has_limited_quota?: boolean;
  quota_count?: number;
}

interface Reward {
  id: number;
  name: string;
  description: string;
  cost_type: 'coin' | 'diamond';
  cost_amount: number;
  icon: string;
  is_active: boolean;
  is_hidden?: boolean;
  is_special_product?: boolean;
  reward_multiplier?: number;
  reward_point_type?: string | null;
  min_level?: number; // 最低等级要求，0表示不限制
}

// 用户管理标签组件
function UsersTab({ users }: { users: User[] }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditPointsModal, setShowEditPointsModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'child' as 'parent' | 'child'
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [editingPoints, setEditingPoints] = useState({
    coins: 0,
    diamonds: 0,
    energy: 0
  });

  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setShowAddModal(false);
        // 重置表单
        setNewUser({
          username: '',
          password: '',
          role: 'child'
        });
        // 刷新页面以显示新用户
        window.location.reload();
        alert('用户创建成功');
      } else {
        const errorData = await response.json();
        alert(`创建失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      alert('创建用户时发生错误，请重试');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (response.ok) {
        setShowResetModal(false);
        setResetPassword('');
        setSelectedUser(null);
        alert('密码重置成功');
      } else {
        const errorData = await response.json();
        alert(`密码重置失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      alert('密码重置时发生错误，请重试');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedUser(null);
        // 刷新页面以更新用户列表
        window.location.reload();
        alert('用户删除成功');
      } else {
        const errorData = await response.json();
        alert(`删除失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户时发生错误，请重试');
    }
  };

  // 修改用户积分
  const openEditPointsModal = (user: User) => {
    setSelectedUser(user);
    setEditingPoints({
      coins: user.points.coins,
      diamonds: user.points.diamonds,
      energy: user.points.energy
    });
    setShowEditPointsModal(true);
  };

  const handleEditPoints = async () => {
    if (!selectedUser) return;

    try {
      // 验证输入
      if (editingPoints.coins < 0 || editingPoints.diamonds < 0 || editingPoints.energy < 0) {
        alert('积分数值不能为负数');
        return;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coins: editingPoints.coins,
          diamonds: editingPoints.diamonds,
          energy: editingPoints.energy
        }),
      });

      if (response.ok) {
        setShowEditPointsModal(false);
        setSelectedUser(null);
        // 刷新页面以更新用户列表
        window.location.reload();
        alert('用户积分修改成功');
      } else {
        const errorData = await response.json();
        alert(`积分修改失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('修改积分失败:', error);
      alert('修改积分时发生错误，请重试');
    }
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setResetPassword('');
    setShowResetModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">用户列表</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          添加用户
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{user.username}</h3>
                  <p className="text-sm text-gray-500">角色: {user.role === 'parent' ? '管理员' : '儿童'}</p>
                  {user.created_at && (
                    <p className="text-sm text-gray-500 mt-1">注册时间: {new Date(user.created_at).toLocaleString('zh-CN')}</p>
                  )}
                </div>
                <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  {getLevelName(user.points.energy)}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-yellow-600 font-bold text-xl">{user.points.coins}</div>
                  <div className="text-xs text-yellow-700">金币</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="text-purple-600 font-bold text-xl">{user.points.diamonds}</div>
                  <div className="text-xs text-purple-700">钻石</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-green-600 font-bold text-xl">{user.points.energy}</div>
                  <div className="text-xs text-green-700">能量</div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-orange-500">🔥</span>
                  <span>连续打卡 {user.points.streak_days} 天</span>
                </div>
              </div>
              
              {user.tasks && user.tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">任务状态:</h4>
                  <div className="space-y-1">
                    {user.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{task.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {task.status === 'completed' ? '已完成' : '待完成'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => openEditPointsModal(user)}
                  className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors"
                >
                  修改积分
                </button>
                <button
                  onClick={() => openResetModal(user)}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                >
                  重置密码
                </button>
                {user.role !== 'parent' && (
                  <button
                    onClick={() => openDeleteModal(user)}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
                  >
                    删除用户
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 添加用户模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">添加用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="请输入至少6位密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户角色</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as 'parent' | 'child'})}
                >
                  <option value="child">儿童</option>
                  <option value="parent">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 重置密码模态框 */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">重置 {selectedUser.username} 的密码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="请输入至少6位新密码"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedUser(null);
                  setResetPassword('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 删除用户模态框 */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">确认删除用户</h3>
            <p className="text-gray-600 mb-6">
              确定要删除用户 <span className="font-medium">{selectedUser.username}</span> 吗？
              此操作不可撤销，删除后相关的任务和积分数据也将被清除。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 修改积分模态框 */}
      {showEditPointsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">修改 {selectedUser.username} 的积分</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金币</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={editingPoints.coins}
                  onChange={(e) => setEditingPoints({...editingPoints, coins: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">钻石</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={editingPoints.diamonds}
                  onChange={(e) => setEditingPoints({...editingPoints, diamonds: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">能量</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={editingPoints.energy}
                  onChange={(e) => setEditingPoints({...editingPoints, energy: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditPointsModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleEditPoints}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 任务管理标签组件 - 添加编辑功能和修复刷新问题
function TasksTab({ tasks, onTasksUpdated }: { tasks: Task[], onTasksUpdated: () => Promise<void> }) {
  // 辅助函数：将ISO时间格式化为datetime-local输入框格式（确保显示为北京时间）
  const formatDateTimeForInput = (isoString: string): string => {
    const date = new Date(isoString);
    
    // 直接指定使用北京时间(Asia/Shanghai)格式化日期和时间
    // 格式化为YYYY-MM-DDTHH:mm格式，符合datetime-local输入框要求
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  // 辅助函数：将用户选择的时间转换为ISO字符串（UTC时间）
  const convertLocalTimeToISO = (localDateTimeString: string): string => {
    // 解析用户输入的datetime-local格式（YYYY-MM-DDTHH:mm）
    const parts = localDateTimeString.split(/[-T:]/);
    if (parts.length < 5) return new Date().toISOString();
    
    // 创建一个代表北京时间的Date对象
    const [year, month, day, hours, minutes] = parts.map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    
    // 返回ISO格式的UTC时间
    return date.toISOString();
  };
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    reward_type: 'coin',
    reward_amount: 0,
    is_daily: true,
    recurrence: 'none',
    expiry_time: null,
    target_user_id: null
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [childrenUsers, setChildrenUsers] = useState<User[]>([]);
  // 添加任务分类状态
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'expired'>('all');

  // 判断任务是否过期 - 只有未完成的任务才检查过期状态
  const isTaskExpired = (task: Task): boolean => {
    // 任务已完成则不算过期
    if (task.status === 'completed') {
      return false;
    }
    // 非重复任务且有过期时间，且已过期
    if (task.recurrence === 'none' && task.expiry_time) {
      return new Date(task.expiry_time) < new Date();
    }
    return false;
  };

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'active') {
      return !isTaskExpired(task);
    } else if (taskFilter === 'expired') {
      return isTaskExpired(task);
    }
    return true; // 显示所有任务
  });

  // 加载子用户数据
  useEffect(() => {
    const loadChildrenUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        // 过滤出子用户（非parent角色）
        setChildrenUsers(data.filter((user: User) => user.role !== 'parent'));
      } catch (error) {
        console.error('加载子用户数据失败:', error);
        // 使用mock数据
        setChildrenUsers([
          { id: 1, username: 'xiaoming', role: 'child', points: { coins: 0, diamonds: 0, energy: 0, level: 1, streak_days: 0 } }
        ]);
      }
    };

    loadChildrenUsers();
  }, []);

  const handleEditChange = (key: keyof Task, value: any) => {
    if (editingTask) {
      setEditingTask({
        ...editingTask,
        [key]: value
      });
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleAddTask = async () => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        setShowAddModal(false);
        // 重置表单
        setNewTask({
          title: '',
          description: '',
          reward_type: 'coin',
          reward_amount: 0,
          is_daily: true,
          recurrence: 'none',
          expiry_time: null,
          target_user_id: null
        });
        // 调用父组件传递的刷新函数
        await onTasksUpdated();
        alert('任务创建成功');
      } else {
        const errorData = await response.json();
        alert(`创建失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('创建任务失败:', error);
      alert('创建任务时发生错误，请重试');
    }
  };

  const handleEditSave = async () => {
    if (!editingTask) return;

    try {
      const response = await fetch(`/api/admin/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTask),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingTask(null);
        // 调用父组件传递的刷新函数
        await onTasksUpdated();
        alert('任务更新成功');
      } else {
        const errorData = await response.json();
        alert(`更新失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新任务时发生错误，请重试');
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;

    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      const response = await fetch(`/api/admin/tasks/${editingTask.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingTask(null);
        // 调用父组件传递的刷新函数
        await onTasksUpdated();
        alert('任务删除成功');
      } else {
        const errorData = await response.json();
        alert(`删除失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除任务时发生错误，请重试');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">任务管理</h2>
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          {/* 添加任务分类过滤按钮 */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setTaskFilter('all')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${taskFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} hover:opacity-80 transition-opacity`}
            >
              全部
            </button>
            <button
              onClick={() => setTaskFilter('active')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${taskFilter === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} hover:opacity-80 transition-opacity`}
            >
              活跃任务
            </button>
            <button
              onClick={() => setTaskFilter('expired')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${taskFilter === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'} hover:opacity-80 transition-opacity`}
            >
              过期任务
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors w-full sm:w-auto text-sm"
          >
            发布新任务
          </button>
        </div>
      </div>
      
      {/* 移动端卡片布局 */}
      <div className="space-y-3 md:hidden">
        {filteredTasks.map((task) => {
          const expired = isTaskExpired(task);
          return (
            <div key={task.id} className={`bg-white rounded-xl shadow-md p-4 ${expired ? 'opacity-70' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-gray-900">{task.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {expired ? '已过期' : '活跃'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
              <div className="grid grid-cols-2 gap-y-2 mb-3">
                <div>
                  <p className="text-xs text-gray-500">奖励</p>
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.reward_type === 'coin' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                      {task.reward_type === 'coin' ? '金币' : '钻石'}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{task.reward_amount}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">重复周期</p>
                  <span className="text-sm text-gray-700">
                    {task.recurrence === 'daily' ? '每日' : task.recurrence === 'weekly' ? '每周' : task.recurrence === 'monthly' ? '每月' : '不重复'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">截止时间</p>
                  <p className="text-sm text-gray-700">
                    {task.expiry_time ? new Date(task.expiry_time).toLocaleDateString() : '无'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">目标用户</p>
                  <p className="text-sm text-gray-700">
                    {task.target_username || '全部用户'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleEditClick(task)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                编辑任务
              </button>
            </div>
          );
        })}
      </div>
      
      {/* 桌面端表格布局 */}
      <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">任务名称</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖励类型</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖励数量</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">重复周期</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">截止时间</th>

              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">任务状态</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">目标用户</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map((task) => {
              const expired = isTaskExpired(task);
              return (
                <tr key={task.id} className={expired ? 'opacity-70' : ''}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{task.description}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.reward_type === 'coin' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                      {task.reward_type === 'coin' ? '金币' : '钻石'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.reward_amount}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.recurrence === 'none' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                      {task.recurrence === 'daily' ? '每日' : task.recurrence === 'weekly' ? '每周' : task.recurrence === 'monthly' ? '每月' : '不重复'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                    {task.expiry_time ? new Date(task.expiry_time).toLocaleString() : '无'}
                  </td>

                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {expired ? '已过期' : '活跃'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                    {task.target_username || '全部用户'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(task)}
                      className="text-blue-600 hover:text-blue-900 mr-3 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            {taskFilter === 'active' ? '暂无活跃任务' : taskFilter === 'expired' ? '暂无过期任务' : '暂无任务'}
          </div>
        )}
      </div>

      {/* 添加任务模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-xl sm:rounded-xl pt-8 pb-4 px-4 w-full sm:max-w-md h-[100vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto" style={{ width: '100vw', maxWidth: '100%' }}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">发布新任务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={newTask.title || ''}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="请输入任务名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows={3}
                  placeholder="请输入任务描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">奖励类型</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={newTask.reward_type || 'coin'}
                  onChange={(e) => setNewTask({...newTask, reward_type: e.target.value as 'coin' | 'diamond'})}
                >
                  <option value="coin">金币</option>
                  <option value="diamond">钻石</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">奖励数量</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg text-base text-center text-gray-900"
                  value={newTask.reward_amount || 0}
                  onChange={(e) => setNewTask({...newTask, reward_amount: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重复周期</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={newTask.recurrence || 'none'}
                  onChange={(e) => setNewTask({...newTask, recurrence: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly'})}
                >
                  <option value="none">不重复</option>
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>

              {newTask.recurrence === 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
                  <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none text-gray-900"
                  value={newTask.expiry_time ? formatDateTimeForInput(newTask.expiry_time) : ''}
                  onChange={(e) => setNewTask({...newTask, expiry_time: e.target.value ? convertLocalTimeToISO(e.target.value) : null})}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标用户</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={newTask.target_user_id || ''}
                  onChange={(e) => setNewTask({...newTask, target_user_id: e.target.value ? parseInt(e.target.value) : null})}
                >
                  <option value="">全部用户</option>
                  {childrenUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={handleAddTask}
                className="flex-1 sm:flex-initial px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center text-base font-medium"
              >
                发布
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 sm:flex-initial px-5 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center text-base font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑任务模态框 */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-xl sm:rounded-xl pt-8 pb-4 px-4 w-full sm:max-w-md h-[100vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto" style={{ width: '100vw', maxWidth: '100%' }}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">编辑任务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={editingTask.title}
                  onChange={(e) => handleEditChange('title', e.target.value)}
                  placeholder="请输入任务名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={editingTask.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  rows={3}
                  placeholder="请输入任务描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">奖励类型</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={editingTask.reward_type}
                  onChange={(e) => handleEditChange('reward_type', e.target.value as 'coin' | 'diamond')}
                >
                  <option value="coin">金币</option>
                  <option value="diamond">钻石</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">奖励数量</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg text-base text-center text-gray-900"
                  value={editingTask.reward_amount}
                  onChange={(e) => handleEditChange('reward_amount', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重复周期</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={editingTask.recurrence || 'none'}
                  onChange={(e) => handleEditChange('recurrence', e.target.value as 'none' | 'daily' | 'weekly' | 'monthly')}
                >
                  <option value="none">不重复</option>
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
              {editingTask.recurrence === 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
                  <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none text-gray-900"
                  value={editingTask.expiry_time ? formatDateTimeForInput(editingTask.expiry_time) : ''}
                  onChange={(e) => handleEditChange('expiry_time', e.target.value ? convertLocalTimeToISO(e.target.value) : null)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标用户</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900"
                  value={editingTask.target_user_id || ''}
                  onChange={(e) => handleEditChange('target_user_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">全部用户</option>
                  {childrenUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleEditSave}
                className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-base font-medium"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTask(null);
                }}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center text-base font-medium"
              >
                取消
              </button>
              <button
                onClick={handleDeleteTask}
                className="w-full px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-center text-base font-medium"
              >
                删除任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 兑换商店管理标签组件
function RewardsTab({ rewards, setRewards }: { rewards: Reward[]; setRewards: React.Dispatch<React.SetStateAction<Reward[]>> }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); // 新增编辑模态框状态
  const [editingReward, setEditingReward] = useState<Reward | null>(null); // 新增编辑中的产品状态
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  const [hiddenFilter, setHiddenFilter] = useState<string>('all'); // 'all', 'visible', 'hidden'
  const [specialFilter, setSpecialFilter] = useState<string>('all'); // 'all', 'special', 'regular'
  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    cost_type: 'coin' as 'coin' | 'diamond',
    cost_amount: 0,
    icon: '🎁',
    is_active: true,
    is_hidden: false,
    is_special_product: false,
    reward_multiplier: 1.0,
    reward_point_type: null as string | null,
    min_level: 0 // 默认不限制等级
  });
  const [updatedReward, setUpdatedReward] = useState({
    name: '',
    description: '',
    cost_type: 'coin' as 'coin' | 'diamond',
    cost_amount: 0,
    icon: '🎁',
    is_active: true,
    is_hidden: false,
    is_special_product: false,
    reward_multiplier: 1.0,
    reward_point_type: null as string | null,
    min_level: 0 // 默认不限制等级
  }); // 新增更新产品状态

  // 新增编辑产品函数
  const getLevelName = (level: number): string => {
    const levelNames: Record<number, string> = {
      0: '无限制',
      1: '鸡蛋',
      2: '鸡宝宝',
      3: '青铜鸡',
      4: '铁公鸡',
      5: '钻石鸡',
      6: '白金鸡',
      7: '王者鸡',
      8: '霸道鸡'
    };
    return levelNames[level] || `未知等级(${level})`;
  };

  const handleEditClick = (reward: Reward) => {
    setEditingReward(reward);
    setUpdatedReward({
      name: reward.name,
      description: reward.description,
      cost_type: reward.cost_type,
      cost_amount: reward.cost_amount,
      icon: reward.icon,
      is_active: reward.is_active,
      is_hidden: reward.is_hidden || false,
      is_special_product: reward.is_special_product || false,
      reward_multiplier: reward.reward_multiplier || 1.0,
      reward_point_type: reward.reward_point_type || null,
      min_level: reward.min_level || 0
    });
    setShowEditModal(true);
  };

  // 新增保存编辑产品函数
  const handleEditSave = async () => {
    if (!editingReward) return;
    
    try {
      const response = await fetch(`/api/admin/rewards/${editingReward.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updatedReward,
          min_level: updatedReward.min_level || 0
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingReward(null);
        // 刷新奖励列表
        const rewardsResponse = await fetch('/api/admin/rewards');
        const data = await rewardsResponse.json();
        setRewards(data);
      }
    } catch (error) {
      console.error('更新奖励失败:', error);
    }
  };

  // 新增删除产品函数
  const handleDeleteReward = async () => {
    if (!editingReward) return;
    
    try {
      if (!confirm(`确定要删除产品"${editingReward.name}"吗？此操作不可撤销。`)) {
        return;
      }
      
      const response = await fetch(`/api/admin/rewards/${editingReward.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingReward(null);
        // 刷新奖励列表
        const rewardsResponse = await fetch('/api/admin/rewards');
        const data = await rewardsResponse.json();
        setRewards(data);
      }
    } catch (error) {
      console.error('删除奖励失败:', error);
    }
  };

  const handleAddReward = async () => {
    try {
      const response = await fetch('/api/admin/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newReward,
          min_level: newReward.min_level || 0
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        // 重置表单
        setNewReward({
          name: '',
          description: '',
          cost_type: 'coin',
          cost_amount: 0,
          icon: '🎁',
          is_active: true,
          is_hidden: false,
          is_special_product: false,
          reward_multiplier: 1.0,
          reward_point_type: null,
          min_level: 0
        });
        // 刷新奖励列表
        const rewardsResponse = await fetch('/api/admin/rewards');
        const data = await rewardsResponse.json();
        setRewards(data);
      }
    } catch (error) {
      console.error('添加奖励失败:', error);
    }
  };
  
  // 添加隐藏状态切换函数
  const handleToggleHidden = async (rewardId: number, isHidden: boolean) => {
    try {
      await fetch(`/api/admin/rewards/${rewardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_hidden: !isHidden }),
      });
      // 刷新列表
      const response = await fetch('/api/admin/rewards');
      const data = await response.json();
      setRewards(data);
    } catch (error) {
      console.error('更新隐藏状态失败:', error);
    }
  };

  const handleToggleStatus = async (rewardId: number, isActive: boolean) => {
    try {
      await fetch(`/api/admin/rewards/${rewardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      });
      // 刷新列表
      const response = await fetch('/api/admin/rewards');
      const data = await response.json();
      setRewards(data);
    } catch (error) {
      console.error('更新奖励状态失败:', error);
    }
  };

  // 根据筛选条件过滤奖励
  const filteredRewards = rewards.filter(reward => {
    // 状态筛选（上架/下架）
    if (statusFilter === 'active' && !reward.is_active) return false;
    if (statusFilter === 'inactive' && reward.is_active) return false;
    
    // 显示/隐藏筛选
    if (hiddenFilter === 'visible' && (reward.is_hidden || false)) return false;
    if (hiddenFilter === 'hidden' && !(reward.is_hidden || false)) return false;
    
    // 特殊商品筛选
    if (specialFilter === 'special' && !(reward.is_special_product || false)) return false;
    if (specialFilter === 'regular' && (reward.is_special_product || false)) return false;
    
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">兑换商店管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          添加产品
        </button>
      </div>
      
      {/* 筛选控件 */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 上架状态筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">上架状态</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">全部</option>
            <option value="active">已上架</option>
            <option value="inactive">已下架</option>
          </select>
        </div>
        
        {/* 显示/隐藏筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">显示状态</label>
          <select
            value={hiddenFilter}
            onChange={(e) => setHiddenFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">全部</option>
            <option value="visible">显示中</option>
            <option value="hidden">已隐藏</option>
          </select>
        </div>
        
        {/* 特殊商品筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品类型</label>
          <select
            value={specialFilter}
            onChange={(e) => setSpecialFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">全部</option>
            <option value="special">特殊商品</option>
            <option value="regular">普通商品</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{reward.icon}</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleToggleStatus(reward.id, reward.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${reward.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {reward.is_active ? '上架' : '下架'}
                  </button>
                  <button
                    onClick={() => handleToggleHidden(reward.id, reward.is_hidden || false)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${(reward.is_hidden || false) ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {(reward.is_hidden || false) ? '已隐藏' : '隐藏'}
                  </button>
                  {/* 新增编辑按钮 */}
                  <button
                    onClick={() => handleEditClick(reward)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    编辑
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{reward.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{reward.description}</p>
              <div className="mb-4">
                <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${(reward.min_level || 0) > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                  {reward.min_level && reward.min_level > 0 ? 
                    `最低等级: ${getLevelName(reward.min_level)}` : 
                    '无等级限制'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className={`text-lg font-bold ${reward.cost_type === 'coin' ? 'text-yellow-600' : 'text-purple-600'}`}>
                  {reward.cost_amount} {reward.cost_type === 'coin' ? '金币' : '钻石'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 添加奖励模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-full w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-6">添加产品</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">产品名称</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.name}
                  onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">产品描述</label>
                <textarea
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.description}
                  onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">兑换类型</label>
                <select
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.cost_type}
                  onChange={(e) => setNewReward({...newReward, cost_type: e.target.value as 'coin' | 'diamond'})}
                >
                  <option value="coin">金币</option>
                  <option value="diamond">钻石</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">所需数量</label>
                <input
                  type="number"
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.cost_amount}
                  onChange={(e) => setNewReward({...newReward, cost_amount: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">图标</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.icon}
                  onChange={(e) => setNewReward({...newReward, icon: e.target.value})}
                  placeholder="输入emoji图标"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">最低等级要求</label>
                <select
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.min_level || 0}
                  onChange={(e) => setNewReward({...newReward, min_level: parseInt(e.target.value)})}
                >
                  <option value="0">不限制等级</option>
                  <option value="1">鸡蛋 (0-29能量)</option>
                  <option value="2">鸡宝宝 (30-69能量)</option>
                  <option value="3">青铜鸡 (70-149能量)</option>
                  <option value="4">铁公鸡 (150-249能量)</option>
                  <option value="5">钻石鸡 (250-499能量)</option>
                  <option value="6">白金鸡 (500-999能量)</option>
                  <option value="7">王者鸡 (1000-1999能量)</option>
                  <option value="8">霸道鸡 (≥2000能量)</option>
                </select>
              </div>
              {/* 特殊商品设置 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">特殊商品设置</label>
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="is_special_product"
                    className="h-5 w-5 text-purple-600 border-gray-300 rounded mr-3 focus:ring-purple-500"
                    checked={newReward.is_special_product}
                    onChange={(e) => setNewReward({...newReward, is_special_product: e.target.checked})}
                  />
                  <label htmlFor="is_special_product" className="text-base text-gray-700">
                    是否为特殊商品
                  </label>
                </div>
                
                {newReward.is_special_product && (
                  <div className="pl-8 space-y-4 mt-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">奖励积分倍数</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        value={newReward.reward_multiplier}
                        onChange={(e) => setNewReward({...newReward, reward_multiplier: parseFloat(e.target.value) || 1.0})}
                        placeholder="例如: 1.5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">奖励积分类型</label>
                      <select
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={newReward.reward_point_type || 'coin'}
                  onChange={(e) => setNewReward({...newReward, reward_point_type: e.target.value})}
                >
                        <option value="coin">金币 (coin)</option>
                        <option value="diamond">钻石 (diamond)</option>
                        <option value="energy">能量 (energy)</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-2">设置后，用户兑换此商品当天对应类型的积分奖励将按倍数增加</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="h-5 w-5 text-purple-600 border-gray-300 rounded mr-3 focus:ring-purple-500"
                    checked={newReward.is_active}
                    onChange={(e) => setNewReward({...newReward, is_active: e.target.checked})}
                  />
                  <label htmlFor="isActive" className="text-base text-gray-700">
                    立即上架
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isHidden"
                    className="h-5 w-5 text-purple-600 border-gray-300 rounded mr-3 focus:ring-purple-500"
                    checked={newReward.is_hidden}
                    onChange={(e) => setNewReward({...newReward, is_hidden: e.target.checked})}
                  />
                  <label htmlFor="isHidden" className="text-base text-gray-700">
                    隐藏产品（用户端不可见）
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                取消
              </button>
              <button
                onClick={handleAddReward}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 编辑奖励模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-full w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-6">编辑产品</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">产品名称</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.name}
                  onChange={(e) => setUpdatedReward({...updatedReward, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">产品描述</label>
                <textarea
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.description}
                  onChange={(e) => setUpdatedReward({...updatedReward, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">兑换类型</label>
                <select
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.cost_type}
                  onChange={(e) => setUpdatedReward({...updatedReward, cost_type: e.target.value as 'coin' | 'diamond'})}
                >
                  <option value="coin">金币</option>
                  <option value="diamond">钻石</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">所需数量</label>
                <input
                  type="number"
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.cost_amount}
                  onChange={(e) => setUpdatedReward({...updatedReward, cost_amount: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">图标</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.icon}
                  onChange={(e) => setUpdatedReward({...updatedReward, icon: e.target.value})}
                  placeholder="输入emoji图标"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">最低等级要求</label>
                <select
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.min_level || 0}
                  onChange={(e) => setUpdatedReward({...updatedReward, min_level: parseInt(e.target.value)})}
                >
                  <option value="0">不限制等级</option>
                  <option value="1">鸡蛋 (0-29能量)</option>
                  <option value="2">鸡宝宝 (30-69能量)</option>
                  <option value="3">青铜鸡 (70-149能量)</option>
                  <option value="4">铁公鸡 (150-249能量)</option>
                  <option value="5">钻石鸡 (250-499能量)</option>
                  <option value="6">白金鸡 (500-999能量)</option>
                  <option value="7">王者鸡 (1000-1999能量)</option>
                  <option value="8">霸道鸡 (≥2000能量)</option>
                </select>
              </div>
              {/* 特殊商品设置 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">特殊商品设置</label>
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="edit_is_special_product"
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500"
                    checked={updatedReward.is_special_product}
                    onChange={(e) => setUpdatedReward({...updatedReward, is_special_product: e.target.checked})}
                  />
                  <label htmlFor="edit_is_special_product" className="text-base text-gray-700">
                    是否为特殊商品
                  </label>
                </div>
                
                {updatedReward.is_special_product && (
                  <div className="pl-8 space-y-4 mt-3">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">奖励积分倍数</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={updatedReward.reward_multiplier}
                        onChange={(e) => setUpdatedReward({...updatedReward, reward_multiplier: parseFloat(e.target.value) || 1.0})}
                        placeholder="例如: 1.5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">奖励积分类型</label>
                      <select
                  className="w-full px-5 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={updatedReward.reward_point_type || 'coin'}
                  onChange={(e) => setUpdatedReward({...updatedReward, reward_point_type: e.target.value})}
                >
                        <option value="coin">金币 (coin)</option>
                        <option value="diamond">钻石 (diamond)</option>
                        <option value="energy">能量 (energy)</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-2">设置后，用户兑换此商品当天对应类型的积分奖励将按倍数增加</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500"
                    checked={updatedReward.is_active}
                    onChange={(e) => setUpdatedReward({...updatedReward, is_active: e.target.checked})}
                  />
                  <label htmlFor="editIsActive" className="text-base text-gray-700">
                    上架
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsHidden"
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500"
                    checked={updatedReward.is_hidden}
                    onChange={(e) => setUpdatedReward({...updatedReward, is_hidden: e.target.checked})}
                  />
                  <label htmlFor="editIsHidden" className="text-base text-gray-700">
                    隐藏产品（用户端不可见）
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReward(null);
                }}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                取消
              </button>
              <button
                onClick={handleDeleteReward}
                className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                删除
              </button>
              <button
                onClick={handleEditSave}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'rewards' | 'approvals' | 'streak-dates' | 'streak-rewards' | 'lucky-box' | 'system-settings'>('approvals');
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();
  const tabsRef = useRef<HTMLDivElement>(null);

  // 检查用户角色
  useEffect(() => {
    const checkAdminRole = () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (user.role !== 'parent') {
          router.push('/');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    checkAdminRole();
  }, [router]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        if (activeTab === 'users') {
          const response = await fetch('/api/admin/users');
          const data = await response.json();
          setUsers(data);
        } else if (activeTab === 'tasks') {
          const response = await fetch('/api/admin/tasks');
          const data = await response.json();
          setTasks(data);
        } else if (activeTab === 'rewards') {
          const response = await fetch('/api/admin/rewards');
          const data = await response.json();
          setRewards(data);
        } else if (activeTab === 'approvals') {
        await fetchTaskRecords();
        }
      } catch (err) {
        setError('加载数据失败');
        console.error('加载数据错误:', err);
        // 使用mock数据
        loadMockData();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  // 获取任务记录 - 支持筛选不同状态
  const fetchTaskRecords = async (status = '') => {
    setLoading(true);
    try {
      const url = status ? `/api/admin/tasks/approval?status=${status}` : '/api/admin/tasks/approval';
      console.log('调用任务审核API:', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('获取到的任务数据:', data);
        setPendingTasks(data || []);
        console.log('更新后的pendingTasks状态:', data?.length || 0);
      }
    } catch (error) {
      console.error('获取任务记录失败:', error);
      // 使用mock数据
      setPendingTasks([
        {
          user_task_id: 1,
          username: 'xiaoming',
          task_title: '完成数学作业',
          completed_date: new Date().toISOString(),
          reward_type: 'coin',
          reward_amount: 10,
          approval_status: status || 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 处理审核操作
  const handleApprove = async (taskId: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/tasks/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_task_id: taskId,
          action: action
        }),
      });

      if (response.ok) {
        await fetchTaskRecords();
        setError('');
        alert(action === 'approve' ? '任务审核通过' : '任务审核拒绝');
      } else {
        // 获取API返回的具体错误信息
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '审核操作失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      setError((error as Error).message || '审核操作失败，请稍后重试');
      alert((error as Error).message || '审核操作失败，请稍后重试');
    }
  };

  // 刷新任务列表的函数 - 从外部调用
  const refreshTasks = async () => {
    try {
      const response = await fetch('/api/admin/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('刷新任务列表失败:', error);
    }
  };

  // Mock数据
  const loadMockData = () => {
    if (activeTab === 'users') {
      setUsers([
        {
          id: 1,
          username: 'xiaoming',
          role: 'child',
          points: {
            coins: 1000,
            diamonds: 50,
            energy: 100,
            level: 5,
            streak_days: 3
          },
          tasks: [
            { id: 1, title: '完成数学作业', description: '完成今日数学练习', reward_type: 'coin', reward_amount: 10, is_daily: true, status: 'completed', completed_at: new Date().toISOString() },
            { id: 2, title: '打扫房间', description: '打扫自己的房间', reward_type: 'diamond', reward_amount: 2, is_daily: true, status: 'pending', completed_at: null }
          ]
        }
      ]);
    } else if (activeTab === 'tasks') {
      setTasks([
        {
          id: 1,
          title: '完成数学作业',
          description: '完成课本第35-36页的练习题',
          reward_type: 'diamond',
          reward_amount: 5,
          is_daily: true
        }
      ]);
    } else if (activeTab === 'rewards') {
      setRewards([
        {
          id: 1,
          name: '玩具车',
          description: '遥控玩具车',
          cost_type: 'diamond',
          cost_amount: 100,
          icon: '🚗',
          is_active: true
        }
      ]);
    }
  };

  // 处理登出
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="text-2xl font-bold text-purple-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      {/* 顶部导航栏 - 响应式设计 */}
      <header className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Calendar className="text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">管理员控制台</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors px-3 py-1 rounded"
          >
            <span className="hidden sm:inline">前台页</span>
            <span className="sm:hidden">前台</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors px-3 py-1 rounded"
          >
            <span className="hidden sm:inline">退出</span>
            <span className="sm:hidden">登出</span>
          </button>
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 text-center">
          {error}
        </div>
      )}

      {/* 主内容区域 - 优化移动端显示 */}
      <main className="container mx-auto px-4 py-4 sm:py-6 pb-24">
        {/* 标签切换 - 响应式设计 */}
        {/* 移动端下拉菜单 */}
        <div className="mb-4 md:hidden">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`w-full p-3 rounded-lg text-left flex justify-between items-center bg-purple-100 text-purple-600`}
          >
            <div className="flex items-center space-x-2">
              {activeTab === 'users' && <Users size={18} />}
              {activeTab === 'tasks' && <Calendar size={18} />}
              {activeTab === 'rewards' && <Store size={18} />}
              {activeTab === 'approvals' && <Check size={18} />}
              {activeTab === 'streak-dates' && <Calendar size={18} />}
              {activeTab === 'streak-rewards' && <Award size={18} />}
              {activeTab === 'lucky-box' && <Gift size={18} />}
              <span>
                {activeTab === 'users' && '用户管理'}
                {activeTab === 'tasks' && '任务管理'}
                {activeTab === 'rewards' && '兑换商店管理'}
                {activeTab === 'approvals' && '任务审核'}
                {activeTab === 'streak-dates' && '连胜日期管理'}
                {activeTab === 'streak-rewards' && '连胜奖励管理'}
                {activeTab === 'lucky-box' && '神秘盲盒管理'}
              {activeTab === 'system-settings' && '系统设置'}
              </span>
            </div>
            {showMobileMenu ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {showMobileMenu && (
            <div className="mt-2 bg-white rounded-lg shadow-lg overflow-hidden">
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'users' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('users'); setShowMobileMenu(false); }}
              >
                <Users size={18} />
                <span>用户管理</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'tasks' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('tasks'); setShowMobileMenu(false); }}
              >
                <Calendar size={18} />
                <span>任务管理</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'approvals' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('approvals'); setShowMobileMenu(false); }}
              >
                <Check size={18} />
                <span>任务审核</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'rewards' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('rewards'); setShowMobileMenu(false); }}
              >
                <Store size={18} />
                <span>兑换商店管理</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'streak-rewards' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('streak-rewards'); setShowMobileMenu(false); }}
              >
                <Award size={18} />
                <span>连胜奖励管理</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'lucky-box' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('lucky-box'); setShowMobileMenu(false); }}
              >
                <Gift size={18} />
                <span>神秘盲盒管理</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'streak-dates' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('streak-dates'); setShowMobileMenu(false); }}
              >
                <Calendar size={18} />
                <span>连胜日期管理</span>
              </button>
              <button
                className={`w-full p-3 text-left flex items-center space-x-2 ${activeTab === 'system-settings' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                onClick={() => { setActiveTab('system-settings'); setShowMobileMenu(false); }}
              >
                <Settings size={18} />
                <span>系统设置</span>
              </button>
            </div>
          )}
        </div>
        
        {/* 桌面端水平标签 */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide" ref={tabsRef}>
          <div className="flex space-x-1 pb-2 border-b min-w-max">
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('users')}
            >
              <div className="flex items-center space-x-1">
                <Users size={16} />
                <span>用户管理</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'tasks' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('tasks')}
            >
              <div className="flex items-center space-x-1">
                <Calendar size={16} />
                <span>任务管理</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'approvals' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('approvals')}
            >
              <div className="flex items-center space-x-1">
                <Check size={16} />
                <span>任务审核</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'rewards' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('rewards')}
            >
              <div className="flex items-center space-x-1">
                <Store size={16} />
                <span>兑换商店管理</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'streak-rewards' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('streak-rewards')}
            >
              <div className="flex items-center space-x-1">
                <Award size={16} />
                <span>连胜奖励管理</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'lucky-box' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('lucky-box')}
            >
              <div className="flex items-center space-x-1">
                <Gift size={16} />
                <span>神秘盲盒管理</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'streak-dates' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('streak-dates')}
            >
              <div className="flex items-center space-x-1">
                <Calendar size={16} />
                <span>连胜日期管理</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'system-settings' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('system-settings')}
            >
              <div className="flex items-center space-x-1">
                <Settings size={16} />
                <span>系统设置</span>
              </div>
            </button>
          </div>
        </div>

        {/* 用户管理页面 */}
        {activeTab === 'users' && (
          <UsersTab users={users} />
        )}

        {/* 任务管理页面 - 传递刷新函数 */}
        {activeTab === 'tasks' && (
          <TasksTab tasks={tasks} onTasksUpdated={refreshTasks} />
        )}

        {/* 兑换商店管理页面 */}
        {activeTab === 'rewards' && (
          <RewardsTab rewards={rewards} setRewards={setRewards} />
        )}

        {/* 任务审核页面 - 响应式设计 */}
        {activeTab === 'approvals' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">任务审核</h2>
              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => fetchTaskRecords('pending')}
                    className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    待审核
                  </button>
                  <button
                    onClick={() => fetchTaskRecords('approved')}
                    className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  >
                    已通过
                  </button>
                  <button
                    onClick={() => fetchTaskRecords('rejected')}
                    className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    已拒绝
                  </button>
                  <button
                    onClick={() => fetchTaskRecords('')}
                    className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    全部
                  </button>
                </div>
                <button
                  onClick={() => fetchTaskRecords()}
                  className="flex items-center justify-center space-x-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm w-full sm:w-auto"
                >
                  <RotateCcw size={14} />
                  <span>刷新</span>
                </button>
              </div>
            </div>
            
            {/* 移动端卡片布局 */}
            <div className="space-y-3 md:hidden">
              {pendingTasks.map((task) => (
                <div key={task.user_task_id} className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.username}</p>
                      <p className="text-xs text-gray-500 mt-1">{task.task_title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.approval_status === 'pending' ? 'bg-orange-100 text-orange-700' : task.approval_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {task.approval_status === 'pending' ? '待审核' : task.approval_status === 'approved' ? '已通过' : '已拒绝'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">完成时间</p>
                      <p className="text-sm text-gray-700">{task.completed_date ? new Date(task.completed_date).toLocaleString('zh-CN') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">奖励</p>
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.reward_type === 'coin' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                          {task.reward_type === 'coin' ? '金币' : '钻石'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{task.reward_amount}</span>
                      </div>
                    </div>
                  </div>
                  {task.approval_status === 'pending' && (
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => handleApprove(task.user_task_id, 'approve')}
                        className="flex-1 flex items-center justify-center space-x-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        <Check size={14} />
                        <span>通过</span>
                      </button>
                      <button
                        onClick={() => handleApprove(task.user_task_id, 'reject')}
                        className="flex-1 flex items-center justify-center space-x-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        <X size={14} />
                        <span>拒绝</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 桌面端表格布局 */}
            <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">任务名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">完成时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖励类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖励数量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingTasks.map((task) => (
                    <tr key={task.user_task_id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{task.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.task_title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {task.completed_date ? new Date(task.completed_date).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.reward_type === 'coin' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                          {task.reward_type === 'coin' ? '金币' : '钻石'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{task.reward_amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.approval_status === 'pending' ? 'bg-orange-100 text-orange-700' : task.approval_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {task.approval_status === 'pending' ? '待审核' : task.approval_status === 'approved' ? '已通过' : '已拒绝'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {task.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(task.user_task_id, 'approve')}
                              className="text-green-600 hover:text-green-900 mr-3 flex items-center space-x-1 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                            >
                              <Check size={14} />
                              <span>通过</span>
                            </button>
                            <button
                              onClick={() => handleApprove(task.user_task_id, 'reject')}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <X size={14} />
                              <span>拒绝</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {pendingTasks.length === 0 && !loading && (
              <div className="py-8 sm:py-10 text-center text-gray-500 bg-white rounded-xl shadow-md">
                暂无待审核任务
              </div>
            )}
          </div>
        )}
        
          {/* 连胜日期管理页面 */}
        {activeTab === 'streak-dates' && (
          <div className="p-6 bg-white rounded-lg shadow">
            <StreakDatesTab users={users} />
          </div>
        )}
          
          {/* 连胜奖励管理页面 */}
        {activeTab === 'streak-rewards' && (
          <div className="p-6 bg-white rounded-lg shadow">
            <StreakRewardsTab />
          </div>
        )}
        
        {/* 神秘盲盒管理页面 */}
        {activeTab === 'lucky-box' && (
          <div className="p-6 bg-white rounded-lg shadow">
            <LuckyBoxTab />
          </div>
        )}
        
        {/* 系统设置页面 */}
        {activeTab === 'system-settings' && (
          <div className="p-6 bg-white rounded-lg shadow">
            <SystemSettingsTab />
          </div>
        )}
      </main>

      {/* 底部导航 - 已移除返回首页选项 */}
    </div>
  );
}