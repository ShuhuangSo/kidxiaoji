import React, { useState, useEffect, useRef } from 'react';
import { Award, Coins, Sparkles, GripHorizontal, RotateCcw, Star } from 'lucide-react';

// 定义接口
interface LotteryConfig {
  id: number;
  name: string;
  cost_type: 'coin' | 'diamond' | 'energy';
  cost_amount: number;
  description?: string;
  prizes: LotteryPrize[];
}

interface LotteryPrize {
  id: number;
  lottery_id: number;
  name: string;
  description?: string;
  icon: string;
  probability: number;
  type: 'point' | 'product';
  point_type?: 'coin' | 'diamond' | 'energy';
  point_amount?: number;
  product_id?: number;
  is_special?: boolean;
}

interface UserData {
  points: {
    coins: number;
    diamonds: number;
    energy: number;
  };
  id?: number; // 用户ID字段
}

interface LotterySlotMachineProps {
  lotteryConfig: LotteryConfig | null;
  userData: UserData;
  onUserDataUpdate: (newData: UserData) => void;
}

// 定义老虎机轮盘图标
const slotItems = ['🍎', '🍊', '🍋', '🍉', '🍇', '💎', '🔥', '🎁', '⭐', '💰', '🍒', '7️⃣'];

// 老虎机组件
const LotterySlotMachine: React.FC<LotterySlotMachineProps> = ({ 
  lotteryConfig, 
  userData, 
  onUserDataUpdate 
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState<string[]>(['', '', '']);
  const [prizeResult, setPrizeResult] = useState<LotteryPrize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spinCount, setSpinCount] = useState(0);
  
  const reelRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // 获取积分类型的图标
  const getPointIcon = (type: 'coin' | 'diamond' | 'energy') => {
    switch (type) {
      case 'coin':
        return <Coins className="inline mr-1" size={16} />;
      case 'diamond':
        return <Sparkles className="inline mr-1" size={16} />;
      case 'energy':
        return <Star className="inline mr-1" size={16} />;
      default:
        return null;
    }
  };

  // 检查用户是否有足够的积分
  const hasEnoughPoints = (): boolean => {
    if (!lotteryConfig) return false;
    
    switch (lotteryConfig.cost_type) {
      case 'coin':
        return userData.points.coins >= lotteryConfig.cost_amount;
      case 'diamond':
        return userData.points.diamonds >= lotteryConfig.cost_amount;
      case 'energy':
        return userData.points.energy >= lotteryConfig.cost_amount;
      default:
        return false;
    }
  };

  // 执行抽奖
  const handleSpin = async () => {
    if (!lotteryConfig || isSpinning || loading || !hasEnoughPoints()) return;
    
    setError('');
    setShowResult(false);
    setPrizeResult(null);
    setIsSpinning(true);
    setSpinCount(prev => prev + 1);
    
    try {
      console.log('开始抽奖，配置ID:', lotteryConfig.id);
      
      // 开始动画
      startSpinAnimation();
      
      // 调用抽奖API
      const response = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData.id, // 添加用户ID
          lottery_id: lotteryConfig.id,
        }),
      });
      
      console.log('抽奖API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error('抽奖失败，请稍后重试');
      }
      
      const data = await response.json();
      console.log('抽奖API返回数据:', data);
      
      // 模拟延迟以显示动画
      setTimeout(() => {
        // 停止动画并显示结果
        stopSpinAnimation(data.result.icon, data.prize);
        
        // 更新用户积分
        if (data.new_points) {
          onUserDataUpdate({
            points: {
              coins: data.new_points.coins,
              diamonds: data.new_points.diamonds,
              energy: data.new_points.energy,
            }
          });
        }
      }, 3000);
      
    } catch (err) {
      console.error('抽奖失败:', err);
      setError(err instanceof Error ? err.message : '抽奖过程中发生错误');
      setIsSpinning(false);
    }
  };

  // 开始旋转动画
  const startSpinAnimation = () => {
    reelRefs.forEach(reelRef => {
      if (reelRef.current) {
        reelRef.current.style.transition = 'none';
        reelRef.current.style.transform = 'translateY(0)';
      }
    });
    
    // 强制重绘
    setTimeout(() => {
      reelRefs.forEach((reelRef, index) => {
        if (reelRef.current) {
          const randomOffset = Math.random() * 1000;
          reelRef.current.style.transition = `transform ${3 + index * 0.5}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
          reelRef.current.style.transform = `translateY(-${randomOffset}px)`;
        }
      });
    }, 50);
  };

  // 停止旋转动画并显示结果
  const stopSpinAnimation = (resultIcon: string, prize: LotteryPrize) => {
    setResults([resultIcon, resultIcon, resultIcon]);
    setPrizeResult(prize);
    setShowResult(true);
    setIsSpinning(false);
  };

  // 重置抽奖结果
  const resetResult = () => {
    setShowResult(false);
    setPrizeResult(null);
    setError('');
  };

  // 格式化概率显示
  const formatProbability = (probability: number) => {
    return `${(probability * 100).toFixed(2)}%`;
  };

  if (!lotteryConfig) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🎰</div>
        <p className="text-gray-600">抽奖配置未加载</p>
        <p className="text-sm text-gray-500 mt-2">请刷新页面重试</p>
      </div>
    );
  }

  if (!userData?.points) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">💰</div>
        <p className="text-gray-600">用户积分信息未加载</p>
        <p className="text-sm text-gray-500 mt-2">请刷新页面重试</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">{lotteryConfig.name}</h2>
      
      {lotteryConfig.description && (
        <p className="text-gray-600 text-center mb-6">{lotteryConfig.description}</p>
      )}

      {/* 老虎机显示区域 */}
      <div className="relative w-full max-w-xs mb-6">
        <div className="flex justify-between gap-2">
          {/* 三个轮盘 */}
          {[0, 1, 2].map((index) => (
            <div 
              key={index}
              ref={reelRefs[index]}
              className="w-20 h-20 bg-white rounded-lg border-2 border-gray-300 overflow-hidden flex items-center justify-center"
            >
              <span className="text-4xl">{results[index] || slotItems[Math.floor(Math.random() * slotItems.length)]}</span>
            </div>
          ))}
        </div>
        
        {/* 分隔线 */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform translate-y-1/2"></div>
      </div>

      {/* 抽奖按钮 */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleSpin}
          disabled={!hasEnoughPoints() || isSpinning || loading}
          className={`px-8 py-3 rounded-full text-white font-bold transition-all duration-300 transform ${!hasEnoughPoints() 
            ? 'bg-gray-300 cursor-not-allowed' 
            : isSpinning 
              ? 'bg-purple-700 animate-pulse' 
              : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'}`}
        >
          {!hasEnoughPoints() 
            ? '积分不足' 
            : isSpinning 
              ? '抽奖中...' 
              : '开始抽奖'}
        </button>
        
        <p className="mt-2 text-sm text-gray-600">
          消耗: {getPointIcon(lotteryConfig.cost_type)} {lotteryConfig.cost_amount}
        </p>
        
        <p className="mt-1 text-sm text-gray-600">
          当前余额: {getPointIcon(lotteryConfig.cost_type)} 
          {userData.points[lotteryConfig.cost_type as keyof typeof userData.points]}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 结果展示 */}
      {showResult && prizeResult && (
        <div className="mt-6 p-4 rounded-lg border-2" style={{ 
          backgroundColor: prizeResult.is_special ? '#fff3cd' : '#e8f5e9',
          borderColor: prizeResult.is_special ? '#ffeaa7' : '#c3e6cb'
        }}>
          <h3 className="text-xl font-bold mb-2 text-center">恭喜获得!</h3>
          <div className="flex flex-col items-center">
            <span className="text-5xl mb-2">{prizeResult.icon}</span>
            <p className="text-lg font-semibold">{prizeResult.name}</p>
            {prizeResult.description && (
              <p className="text-gray-600 mt-1">{prizeResult.description}</p>
            )}
            {prizeResult.type === 'point' && prizeResult.point_type && prizeResult.point_amount && (
              <p className="mt-2 text-green-600 font-semibold">
                {getPointIcon(prizeResult.point_type)} {prizeResult.point_amount}
              </p>
            )}
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={resetResult}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 奖品概率展示 */}
      <div className="mt-8 w-full">
        <h3 className="text-lg font-semibold mb-2 text-center">奖品概率</h3>
        <div className="grid grid-cols-2 gap-2">
          {lotteryConfig.prizes.map((prize) => (
            <div 
              key={prize.id} 
              className="flex items-center p-2 bg-white rounded-lg border border-gray-200"
              style={{ 
                borderColor: prize.is_special ? '#ffd700' : '#e0e0e0',
                boxShadow: prize.is_special ? '0 0 10px rgba(255, 215, 0, 0.3)' : 'none'
              }}
            >
              <span className="text-2xl mr-2">{prize.icon}</span>
              <div>
                <p className="text-sm font-medium">{prize.name}</p>
                <p className="text-xs text-gray-500">{formatProbability(prize.probability)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LotterySlotMachine;