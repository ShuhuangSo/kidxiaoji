'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomeIcon, StoreIcon, CalendarIcon, SettingsIcon, DiamondIcon, BatteryIcon } from '@/components/icons';
import PointsDisplay from '../components/PointsDisplay';
// 使用简单的CSS动画替代framer-motion
import { ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react';

// 添加必要的CSS动画样式
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.8); }
    to { transform: scale(1); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }
  
  .animate-bounce {
    animation: scaleIn 0.5s ease-out;
  }
`;

interface LuckyBox {
  id: number;
  name: string;
  description: string;
  cost_type: 'coin' | 'diamond' | 'energy';
  cost_amount: number;
  icon: string;
  is_active: boolean;
  is_hidden: boolean;
}

interface UserPoints {
  coins: number;
  diamonds: number;
  energy: number;
}

interface LuckyDrawResult {
  success: boolean;
  item_type: 'points' | 'product';
  item_value: number;
  item_detail?: string;
  message?: string;
  product_name?: string;
  product_icon?: string;
  product_description?: string;
}

function LuckyBoxPage() {
  // 注入CSS样式
  const [luckyBoxes, setLuckyBoxes] = useState<LuckyBox[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints>({ coins: 0, diamonds: 0, energy: 0 });
  const [currentBoxIndex, setCurrentBoxIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [drawResult, setDrawResult] = useState<LuckyDrawResult | null>(null);
  const [showError, setShowError] = useState('');
  const [loading, setLoading] = useState(true);

  // 获取盲盒列表
  const fetchLuckyBoxes = async () => {
    try {
      const response = await fetch('/api/admin/lucky-box');
      const data = await response.json();
      // 只显示激活且不隐藏的盲盒
      setLuckyBoxes(data.filter((box: LuckyBox) => box.is_active && !box.is_hidden));
    } catch (error) {
      console.error('获取盲盒列表失败:', error);
      // 模拟数据
      setLuckyBoxes([
        {
          id: 1,
          name: '神秘盲盒',
          description: '打开有惊喜！可能获得金币、钻石或特殊商品。',
          cost_type: 'diamond',
          cost_amount: 10,
          icon: '🎁',
          is_active: true,
          is_hidden: false
        },
        {
          id: 2,
          name: '超级盲盒',
          description: '高级盲盒，有机会获得珍贵奖励！',
          cost_type: 'diamond',
          cost_amount: 30,
          icon: '🎯',
          is_active: true,
          is_hidden: false
        }
      ]);
    }
  };

  // 获取用户积分
  const fetchUserPoints = async () => {
    try {
      const response = await fetch('/api/user/points');
      const data = await response.json();
      setUserPoints(data);
    } catch (error) {
      console.error('获取用户积分失败:', error);
      // 模拟数据
      setUserPoints({ coins: 100, diamonds: 50, energy: 20 });
    }
  };

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      await Promise.all([fetchLuckyBoxes(), fetchUserPoints()]);
      setLoading(false);
    };
    initData();
  }, []);

  // 检查用户是否有足够的积分
  const hasEnoughPoints = (box: LuckyBox): boolean => {
    switch (box.cost_type) {
      case 'coin':
        return userPoints.coins >= box.cost_amount;
      case 'diamond':
        return userPoints.diamonds >= box.cost_amount;
      case 'energy':
        return userPoints.energy >= box.cost_amount;
      default:
        return false;
    }
  };

  // 处理抽奖
  const handleDraw = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const box = luckyBoxes[currentBoxIndex];
    
    // 检查是否有足够的积分
    if (!hasEnoughPoints(box)) {
      const pointName = box.cost_type === 'coin' ? '金币' : box.cost_type === 'diamond' ? '钻石' : '能量';
      setShowError(`您的${pointName}不足，需要${box.cost_amount}${pointName}`);
      setTimeout(() => setShowError(''), 3000);
      return;
    }

    // 开始动画
    setIsSpinning(true);
    setShowResult(false);
    setDrawResult(null);
    setShowError('');

    // 调用API进行兑换和抽奖
    try {
      const response = await fetch('/api/rewards/lucky-box/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ luckyBoxId: box.id })
      });
      
      const result = await response.json();
      
      // 模拟旋转一段时间后显示结果
      setTimeout(() => {
        setIsSpinning(false);
        if (result.success) {
          setDrawResult(result);
          setShowResult(true);
          // 更新用户积分
          fetchUserPoints();
        } else {
          setShowError(result.message || '抽奖失败，请重试');
          setTimeout(() => setShowError(''), 3000);
        }
      }, 3000); // 3秒后显示结果
    } catch (error) {
      console.error('抽奖失败:', error);
      setIsSpinning(false);
      setShowError('网络错误，请重试');
      setTimeout(() => setShowError(''), 3000);
    }
  };

  // 关闭结果弹窗
  const closeResult = () => {
    setShowResult(false);
    setDrawResult(null);
  };

  // 切换盲盒
  const goToNextBox = () => {
    setCurrentBoxIndex((prev) => (prev + 1) % luckyBoxes.length);
  };

  const goToPrevBox = () => {
    setCurrentBoxIndex((prev) => (prev - 1 + luckyBoxes.length) % luckyBoxes.length);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <div className="text-4xl mb-4 animate-pulse">🎁</div>
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (luckyBoxes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <div className="text-4xl mb-4">🎁</div>
        <div className="text-gray-600 text-lg mb-2">暂无可用的盲盒</div>
        <button 
          onClick={() => window.history.back()} 
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
        >
          返回
        </button>
      </div>
    );
  }

  const currentBox = luckyBoxes[currentBoxIndex];
  const canDraw = hasEnoughPoints(currentBox) && !isSpinning;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      {/* 顶部用户信息 */}
      <div className="flex justify-between items-center py-4 px-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm mb-6">
        <div className="flex items-center space-x-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-1">
              <div className="text-yellow-500">💰</div>
              <span className="text-gray-700 font-medium">{userPoints.coins}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="text-purple-500">💎</div>
              <span className="text-gray-700 font-medium">{userPoints.diamonds}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="text-green-500">⚡</div>
              <span className="text-gray-700 font-medium">{userPoints.energy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 盲盒展示区域 */}
      <div className="flex-1 flex flex-col items-center justify-center mb-12">
        {/* 盲盒选择器 */}
        <div className="flex items-center mb-8">
          <button 
            onClick={goToPrevBox} 
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={24} className="text-purple-600" />
          </button>
          
          <div className="mx-4 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{currentBox.name}</h2>
            <p className="text-gray-600 max-w-md">{currentBox.description}</p>
          </div>
          
          <button 
            onClick={goToNextBox} 
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={24} className="text-purple-600" />
          </button>
        </div>

        {/* 盲盒动画区域 */}
        <div className="relative w-64 h-64 mb-8">
          {/* 盲盒旋转动画 */}
          <div
            className={`w-full h-full flex items-center justify-center ${isSpinning ? 'animate-spin' : ''} transition-transform duration-500`}
            style={{
              transform: isSpinning ? 'scale(1.1)' : 'scale(1)',
              animationDuration: isSpinning ? '1s' : '0s'
            }}
          >
            <div className="text-9xl">{currentBox.icon}</div>
          </div>

          {/* 旋转指示器 */}
          {isSpinning && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 animate-spin" style={{ animationDuration: '1s' }}>
              <RotateCw size={32} className="text-purple-600" />
            </div>
          )}
        </div>

        {/* 兑换按钮 */}
        <button
          onClick={handleDraw}
          disabled={!canDraw}
          className={`px-8 py-3 rounded-full font-bold transition-all transform ${canDraw 
            ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          {isSpinning ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>抽奖中...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>兑换盲盒</span>
              <span className={`${currentBox.cost_type === 'coin' ? 'text-yellow-300' : currentBox.cost_type === 'diamond' ? 'text-blue-300' : 'text-green-300'}`}>
                {currentBox.cost_amount} {currentBox.cost_type === 'coin' ? '金币' : currentBox.cost_type === 'diamond' ? '钻石' : '能量'}
              </span>
            </div>
          )}
        </button>

        {/* 错误提示 */}
        {showError && (
          <div className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-full animate-fade-in-up">
            {showError}
          </div>
        )}
      </div>

      {/* 结果弹窗 */}
      {showResult && drawResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={closeResult}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-bold text-gray-800 mb-4">恭喜获得</h3>
            
            {/* 奖品内容 */}
            <div className="mb-6">
              {drawResult.item_type === 'points' ? (
                <div
                  className="text-6xl mb-2 animate-bounce"
                  style={{ animationDelay: '0.2s', animationDuration: '0.5s' }}
                >
                  {(() => {
                    const detail = drawResult.item_detail ? JSON.parse(drawResult.item_detail) : {};
                    const pointType = detail.point_type || 'coin';
                    return pointType === 'coin' ? '💰' : pointType === 'diamond' ? '💎' : '⚡';
                  })()}
                </div>
              ) : (
                <div
                  className="text-6xl mb-2 animate-bounce"
                  style={{ animationDelay: '0.2s', animationDuration: '0.5s' }}
                >
                  {drawResult.product_icon || '🎁'}
                </div>
              )}
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                {drawResult.item_type === 'points' ? (
                  <div className="text-xl font-bold text-purple-600">
                    {(() => {
                      const detail = drawResult.item_detail ? JSON.parse(drawResult.item_detail) : {};
                      const pointType = detail.point_type || 'coin';
                      return `${drawResult.item_value} ${pointType === 'coin' ? '金币' : pointType === 'diamond' ? '钻石' : '能量'}`;
                    })()}
                  </div>
                ) : (
                  <div>
                    <div className="text-xl font-bold text-purple-600">{drawResult.product_name || '神秘奖品'}</div>
                    <div className="text-gray-600 mt-1">{drawResult.product_description || ''}</div>
                  </div>
                )}
              </div>
            </div>

            <button
              className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors"
              onClick={closeResult}
            >
              确定
            </button>
          </div>
        </div>
      )}
      
      {/* 底部返回按钮 */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        >
          返回商店
        </button>
      </div>
      <style>{styles}</style>
    </div>
  );
}

export default LuckyBoxPage;