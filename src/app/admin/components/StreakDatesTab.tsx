import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Snowflake, XCircle } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: string;
}

function StreakDatesTab({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [streakDates, setStreakDates] = useState<string[]>([]);
  const [missedDates, setMissedDates] = useState<string[]>([]);
  const [frozenDates, setFrozenDates] = useState<string[]>([]);
  const [streakInfo, setStreakInfo] = useState({
    streak_days: 0,
    last_streak_date: null,
    consecutive_missed_days: 0
  });
  const [newDate, setNewDate] = useState('');
  const [dateType, setDateType] = useState<'streak' | 'missed' | 'frozen'>('streak'); // 增加冷冻日类型
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 筛选子用户
  const childUsers = users.filter(user => user.role === 'child');

  // 当选择用户变化时获取连胜日期和非连胜日
  useEffect(() => {
    if (selectedUser) {
      fetchStreakDates();
    }
  }, [selectedUser]);

  // 获取用户连胜日期和非连胜日
  const fetchStreakDates = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/admin/streak-dates?user_id=${selectedUser.id}`);
      const data = await response.json();
      
      if (data.success) {
        setStreakDates(data.streakDates);
        setMissedDates(data.missedDates);
        
        // 直接从API获取冷冻日数据，而不是计算
        if (data.frozenDates && Array.isArray(data.frozenDates)) {
          setFrozenDates(data.frozenDates);
        } else {
          setFrozenDates([]);
        }
        
        setStreakInfo(data.streakInfo);
      } else {
        setError(data.message || '获取连胜日期失败');
      }
    } catch (err) {
      setError('获取连胜日期时发生错误');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 处理添加或删除连胜日期、非连胜日或冷冻日
  const handleDateAction = async (date: string, action: 'add' | 'remove', type: 'streak' | 'missed' | 'frozen') => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('开始API调用:', { userId: selectedUser.id, date, action, type });
      const response = await fetch('/api/admin/streak-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          date,
          action,
          type // 传递日期类型（streak、missed或frozen）
        }),
      });
      
      const data = await response.json();
      console.log('API响应:', data);
      
      if (data.success) {
        setSuccess(data.message);
        // 重新获取连胜日期、非连胜日和冷冻日
        await fetchStreakDates();
        // 清空新日期输入
        if (action === 'add') {
          setNewDate('');
        }
      } else {
        setError(data.message || '操作失败');
      }
    } catch (err) {
      setError('操作时发生错误');
      console.error('API调用错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 添加连胜日期或非连胜日或冷冻日
  const handleAddDate = () => {
    if (!newDate) {
      setError('请选择日期');
      return;
    }
    console.log('准备调用handleDateAction:', { date: newDate, action: 'add', type: dateType });
    handleDateAction(newDate, 'add', dateType);
  };

  // 移除连胜日期
  const handleRemoveDate = (date: string) => {
    if (confirm(`确定要移除${date}的连胜记录吗？`)) {
      handleDateAction(date, 'remove', 'streak');
    }
  };

  // 移除非连胜日
  const handleRemoveMissedDate = (date: string) => {
    if (confirm(`确定要移除非连胜日${date}的记录吗？`)) {
      handleDateAction(date, 'remove', 'missed');
    }
  };

  // 移除冷冻日
  const handleRemoveFrozenDate = (date: string) => {
    if (confirm(`确定要移除冷冻日${date}的记录吗？`)) {
      handleDateAction(date, 'remove', 'frozen');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <CalendarDays className="mr-2 text-purple-600" />
        连胜与非连胜日管理
      </h2>
      
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* 成功提示 */}
      {success && (
        <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {/* 用户选择 */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">选择用户</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={selectedUser?.id || ''}
          onChange={(e) => {
            const userId = parseInt(e.target.value);
            setSelectedUser(childUsers.find(user => user.id === userId) || null);
          }}
        >
          <option value="">请选择用户</option>
          {childUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
      </div>
      
      {selectedUser && (
        <>
          {/* 用户连胜信息 */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-lg mb-2">{selectedUser.username} 的连胜信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-500">当前连胜天数</div>
                <div className="text-2xl font-bold text-purple-600">{streakInfo.streak_days}</div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-500">最后连胜日期</div>
                <div className="text-lg font-semibold">
                  {streakInfo.last_streak_date ? 
                    new Date(streakInfo.last_streak_date).toLocaleDateString('zh-CN') : 
                    '无'}
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-500">连续非连胜日</div>
                <div className="text-2xl font-bold text-blue-600">{streakInfo.consecutive_missed_days}</div>
              </div>
            </div>
          </div>
          
          {/* 新增/删除日期 */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-3">添加日期记录</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">选择类型</label>
                <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={dateType}
                    onChange={(e) => setDateType(e.target.value as 'streak' | 'missed' | 'frozen')}
                  >
                    <option value="streak">连胜日</option>
                    <option value="missed">非连胜日</option>
                    <option value="frozen">冷冻日</option>
                  </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-700 mb-1">选择日期</label>
                <div className="flex gap-3">
                  <input
                    type="date"
                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                  <button
                      className={`px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex items-center ${dateType === 'streak' ? 'bg-green-600 text-white hover:bg-green-700' : dateType === 'missed' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                      onClick={handleAddDate}
                      disabled={loading}
                    >
                      <Plus size={18} className="mr-1" />
                      添加
                    </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 连胜日期列表 */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-3">已有的连胜日期</h3>
            {loading ? (
              <div className="text-gray-500">加载中...</div>
            ) : streakDates.length === 0 ? (
              <div className="text-gray-500">该用户暂无连胜记录</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {streakDates.map((date, index) => (
                  <div 
                    key={`${date}-${index}`} 
                    className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="font-medium text-green-800">{new Date(date).toLocaleDateString('zh-CN')}</div>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveDate(date)}
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 新增：非连胜日列表 */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-3 flex items-center">
              <XCircle className="mr-2 text-orange-500" size={18} />
              非连胜日记录
            </h3>
            {loading ? (
              <div className="text-gray-500">加载中...</div>
            ) : missedDates.length === 0 ? (
              <div className="text-gray-500">该用户暂无非连胜日记录</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {missedDates.map((date, index) => (
                  <div 
                    key={`missed-${date}-${index}`} 
                    className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="font-medium text-orange-800">{new Date(date).toLocaleDateString('zh-CN')}</div>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveMissedDate(date)}
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 冷冻日期列表 */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center">
              <Snowflake className="mr-2 text-blue-500" size={18} />
              冷冻日期
            </h3>
            {loading ? (
              <div className="text-gray-500">加载中...</div>
            ) : frozenDates.length === 0 ? (
              <div className="text-gray-500">该用户当前无冷冻日期</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {frozenDates.map((date, index) => (
                  <div 
                    key={`frozen-${date}-${index}`} 
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center">
                      <Snowflake className="mr-2 text-blue-500" size={16} />
                      <div className="font-medium text-blue-800">{new Date(date).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveFrozenDate(date)}
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default StreakDatesTab;