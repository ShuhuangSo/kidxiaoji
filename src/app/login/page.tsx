'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartIcon, ChickenIcon } from '@/components/icons';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      // 保存用户信息到localStorage
      localStorage.setItem('user', JSON.stringify(data));
      // 同时保存用户ID，确保所有页面使用一致的用户ID来源
      localStorage.setItem('currentUserId', data.userId.toString());
      
      // 根据用户角色跳转到不同页面
      if (data.role === 'parent') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-8 border-yellow-400">
          <div className="bg-yellow-400 py-6 px-8 text-center relative">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-500 rounded-full p-4 shadow-lg">
                <ChickenIcon size={40} className="text-white" />
              </div>
            <h2 className="text-3xl font-bold text-white mt-6 mb-2">勤奋小鸡</h2>
            <p className="text-yellow-100">小朋友，快来领取你的奖励吧！</p>
          </div>
          
          <div className="p-8">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-center">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2">用户名</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-transparent transition-all bg-white text-gray-900"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-8">
                <label className="block text-gray-700 font-bold mb-2">密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-transparent transition-all bg-white text-gray-900"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:translate-y-0"
              >
                {isLoading ? '登录中...' : '登录'}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-gray-500">测试账号：</p>
              <p className="text-gray-700 font-medium mt-1">用户名：xiaoming，密码：123456</p>
              <p className="text-gray-700 font-medium">用户名：testuser，密码：test123</p>
              <p className="text-gray-700 font-medium">用户名：admin，密码：admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}