'use client'
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const SystemSettingsTab: React.FC = () => {
  const [hours, setHours] = useState<string>('6');
  const [minutes, setMinutes] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // 获取当前设置
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/system-settings');
      if (response.ok) {
        const data = await response.json();
        setHours(data.hours);
        setMinutes(data.minutes);
      } else {
        setMessage({ type: 'error', text: '获取设置失败' });
      }
    } catch (error) {
      console.error('获取设置失败:', error);
      setMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);

    // 客户端验证
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      setMessage({ type: 'error', text: '小时数必须在0-24之间' });
      return;
    }

    if (isNaN(minutesNum) || minutesNum < 0 || minutesNum > 59) {
      setMessage({ type: 'error', text: '分钟数必须在0-59之间' });
      return;
    }

    if (hoursNum === 0 && minutesNum === 0) {
      setMessage({ type: 'error', text: '持续时间必须大于0' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hours: hoursNum, minutes: minutesNum }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '设置保存成功' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || '保存失败' });
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      setMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setSaving(false);
    }
  };

  // 组件挂载时获取设置
  useEffect(() => {
    fetchSettings();
  }, []);

  // 清除消息
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">系统设置</h2>
      
      {/* 消息提示 */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} className="mr-2" />
          ) : (
            <AlertCircle size={20} className="mr-2" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">积分翻倍效果设置</h3>
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">持续小时数</label>
              <input
                type="number"
                min="0"
                max="24"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">设置积分翻倍效果持续的小时数（0-24）</p>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">持续分钟数</label>
              <input
                type="number"
                min="0"
                max="59"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">设置积分翻倍效果持续的分钟数（0-59）</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-700">
              注意：修改积分翻倍效果的持续时间后，新激活的积分翻倍效果将使用新的持续时间，
              但已经激活的效果不受影响，仍按原设置时间计算有效期。
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center ${saving ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default SystemSettingsTab;