import React, { useState, useRef, useEffect } from 'react';
import { Coins, Sparkles, Star, Trophy, Gift, RefreshCw, Award } from 'lucide-react';

// 为lucky-canvas创建简单封装组件
const LuckyCanvasWheel: React.FC<{
  width?: string | number;
  height?: string | number;
  config: any;
  onClick?: () => void;
  disabled?: boolean;
  onInit?: (instance: any) => void;
}> = ({ width, height, config, onClick, disabled, onInit }) => {
  // 添加早期调试日志
  console.log('🚀 LuckyCanvasWheel组件开始初始化');
  console.log('配置参数:', { width, height, config: typeof config, onClick: typeof onClick, disabled });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const wheelInstance = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 备选转盘UI - 当lucky-canvas加载失败时使用
  const renderFallbackWheel = () => {
    if (!config.prizes || !Array.isArray(config.prizes)) return null;
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}>
        {/* 绘制扇形 */}
        {config.prizes.map((prize: any, index: number) => {
          const sliceAngle = 360 / config.prizes.length;
          const startAngle = index * sliceAngle;
          const midAngle = startAngle + sliceAngle / 2;
          const color = Array.isArray(prize.background) ? prize.background[0] : prize.background || '#e0e0e0';
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((startAngle - sliceAngle/2) * Math.PI / 180)}% ${50 - 50 * Math.sin((startAngle - sliceAngle/2) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + sliceAngle/2) * Math.PI / 180)}% ${50 - 50 * Math.sin((startAngle + sliceAngle/2) * Math.PI / 180)}%)`,
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transformOrigin: 'center',
                transform: `rotate(${midAngle}deg)`
              }}
            >
              <div style={{ 
                transform: 'rotate(-90deg)', 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: '#fff',
                textAlign: 'center'
              }}>
                {prize.title || '奖品'}
              </div>
            </div>
          );
        })}
        {/* 中心按钮 */}
        <div
          onClick={onClick}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            backgroundColor: '#FF6B6B',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            border: '2px solid #333',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff'
          }}
        >
          开始
        </div>
      </div>
    );
  };

  useEffect(() => {
    console.log('🔄 LuckyCanvasWheel useEffect开始执行');
    
    // 确保在客户端执行
    if (typeof window === 'undefined') {
      console.log('🌐 服务端渲染环境，跳过初始化');
      return;
    }
    
    // 检查canvasRef是否存在
    if (!canvasRef.current) {
      console.error('❌ canvasRef不存在');
      setError('容器元素不存在');
      return;
    }
    
    console.log('✅ 客户端环境且canvasRef存在，准备加载lucky-canvas');
    
    // 执行加载函数
    const loadLuckyCanvas = async () => {
      console.log('======= LuckyCanvasWheel初始化开始 =======');
      
      try {
        let luckyCanvasModule: any = null;
        
        // 尝试方式1: 动态import
        try {
          console.log('尝试动态导入lucky-canvas...');
          const module = await import('lucky-canvas');
          luckyCanvasModule = module;
          console.log('动态导入成功:', Object.keys(luckyCanvasModule || {}));
        } catch (importErr) {
          console.warn('动态导入失败，尝试使用require...', (importErr as Error).message);
          
          // 尝试方式2: require (CommonJS方式)
          try {
            luckyCanvasModule = require('lucky-canvas');
            console.log('require导入成功:', Object.keys(luckyCanvasModule || {}));
          } catch (requireErr) {
            console.error('require导入失败:', (requireErr as Error).message);
            throw new Error('无法导入lucky-canvas模块');
          }
        }
        
        // 创建配置对象
        const options = {
          ...config,
          width: width || '100%',
          height: height || 300,
        };
        
        // 验证canvasRef.current是否仍然存在
        if (!canvasRef.current) {
          throw new Error('Canvas元素不存在');
        }
        
        // 检查LuckyWheel是否存在
        if (luckyCanvasModule && luckyCanvasModule.LuckyWheel) {
          console.log('找到LuckyWheel，类型:', typeof luckyCanvasModule.LuckyWheel);
          
          // 尝试不同的初始化方法
          try {
            // 方法1: 作为构造函数使用new
            console.log('尝试使用new关键字初始化');
            wheelInstance.current = new luckyCanvasModule.LuckyWheel(canvasRef.current, options);
            console.log('使用new关键字初始化成功');
          } catch (constructorErr) {
            console.warn('使用new关键字失败，尝试作为普通函数调用...', (constructorErr as Error).message);
            try {
              // 方法2: 作为普通函数调用
              wheelInstance.current = luckyCanvasModule.LuckyWheel(canvasRef.current, options);
              console.log('作为普通函数调用初始化成功');
            } catch (funcErr) {
              console.error('普通函数调用失败:', (funcErr as Error).message);
              throw new Error('无法初始化LuckyWheel');
            }
          }
          
          console.log('转盘实例创建成功');
          setIsInitialized(true);
          
          // 保存实例引用到父组件的ref中
          if (wheelInstance.current && onInit) {
            onInit(wheelInstance.current);
          }
        } else {
          throw new Error('LuckyWheel组件未找到');
        }
      } catch (err) {
        const errorMsg = `初始化错误: ${err instanceof Error ? err.message : String(err)}`;
        console.error('LuckyCanvasWheel:', errorMsg);
        setError(errorMsg);
      }
    };
    
    // 执行加载
    loadLuckyCanvas();

    // 清理函数
    return () => {
      if (wheelInstance.current) {
        try {
          console.log('清理LuckyWheel实例');
          if (typeof wheelInstance.current.destroy === 'function') {
            wheelInstance.current.destroy();
          }
        } catch (error) {
          console.error('销毁实例失败:', error);
        }
        wheelInstance.current = null;
      }
    };
  }, [config, width, height, onInit]); // 添加依赖项

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div 
        onClick={onClick}
        style={{ 
          pointerEvents: disabled ? 'none' : 'auto',
          width: width || '100%',
          height: height || 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}
      >
        <div>
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-red-600 font-medium">抽奖组件加载失败</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              window.location.reload();
            }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={canvasRef} 
      onClick={onClick} 
      style={{ 
        pointerEvents: disabled ? 'none' : 'auto',
        width: width || '100%',
        height: height || 300,
        position: 'relative',
        backgroundColor: isInitialized ? 'transparent' : '#f9fafb',
        display: isInitialized ? 'block' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #e5e7eb',
        borderRadius: '9999px'
      }}
    >
      {!isInitialized && (
        <div className="text-gray-400">
          <div className="text-3xl mb-2">🔄</div>
          <p className="text-sm">加载抽奖转盘...</p>
        </div>
      )}
    </div>
  );
};

// 保持与老虎机组件相同的接口定义
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
  id?: number; // 添加用户ID字段
}

interface LotteryWheelProps {
  lotteryConfig: LotteryConfig | null;
  userData: UserData;
  onUserDataUpdate: (newData: UserData) => void;
}

const LotteryWheel: React.FC<LotteryWheelProps> = ({
  lotteryConfig,
  userData,
  onUserDataUpdate
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [prizeResult, setPrizeResult] = useState<LotteryPrize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const wheelRef = useRef<any>(null);

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

  // 处理抽奖开始回调
  const onStart = () => {
    setIsSpinning(true);
    setError('');
  };

  // 处理抽奖结束回调
  const onEnd = (prize: any) => {
    setIsSpinning(false);
    // 根据奖品索引找到对应的奖品
    if (lotteryConfig && prize.index !== undefined) {
      const resultPrize = lotteryConfig.prizes[prize.index];
      setPrizeResult(resultPrize);
      setShowResult(true);
    }
  };

  // 执行抽奖
  const handleSpin = async () => {
    if (!lotteryConfig || isSpinning || !hasEnoughPoints()) return;
    
    setError('');
    setShowResult(false);
    setPrizeResult(null);
    
    try {
      console.log('开始抽奖，配置ID:', lotteryConfig.id);
      
      // 调用抽奖API
      const response = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 使用默认用户ID 9作为后备，或者从localStorage获取
          user_id: userData.id || 9,
          lottery_id: lotteryConfig.id,
        }),
      });
      
      console.log('抽奖API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error('抽奖失败，请稍后重试');
      }
      
      const data = await response.json();
      console.log('抽奖API返回数据:', data);
      
      // 找到中奖的奖品
      const winningPrize = lotteryConfig.prizes.find(prize => prize.id === data.prize.id);
      
      if (!winningPrize) {
        throw new Error('找不到中奖信息');
      }
      
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
      
      // 查找中奖奖品在数组中的索引
      const prizeIndex = lotteryConfig.prizes.findIndex(prize => prize.id === data.prize.id);
      if (prizeIndex !== -1 && wheelRef.current) {
        // 启动转盘动画，转到指定奖品位置
        wheelRef.current.play(prizeIndex);
      }
      
    } catch (err) {
      console.error('抽奖失败:', err);
      setError(err instanceof Error ? err.message : '抽奖过程中发生错误');
    }
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

  // 格式化奖品数据以适配lucky-canvas
  const formatPrizes = () => {
    if (!lotteryConfig) return [];
    
    // 为每个奖品设置不同的颜色
    const colors = [
      ['#FF6B6B', '#FF8E8E'],
      ['#4ECDC4', '#7EDDD8'],
      ['#FFD166', '#FFE082'],
      ['#6A0572', '#8A2BE2'],
      ['#AB83A1', '#C09FC9'],
      ['#FC5130', '#FF7557'],
      ['#1A535C', '#2B7A78'],
      ['#FF9F1C', '#FFB74D']
    ];

    return lotteryConfig.prizes.map((prize, index) => {
      const colorPair = prize.is_special 
        ? ['#FFD700', '#FFA500'] 
        : colors[index % colors.length];
      
      return {
        title: prize.name,
        description: prize.point_amount ? `${prize.point_amount} ${prize.point_type}` : '',
        background: colorPair,
        fonts: [
          {
            text: prize.icon,
            color: '#FFFFFF',
            size: 24,
            x: '50%',
            y: '40%'
          },
          {
            text: prize.name,
            color: '#FFFFFF',
            size: 14,
            x: '50%',
            y: '65%',
            fontWeight: 'bold'
          },
          {
            text: prize.point_amount ? `${prize.point_amount}` : '',
            color: '#FFFFFF',
            size: 12,
            x: '50%',
            y: '80%'
          }
        ]
      };
    });
  };

  // 配置lucky-canvas
    const config = {
      blocks: [
        {
          padding: '10px',
          background: '#f0f0f0'
        }
      ],
      prizes: formatPrizes(),
      buttons: [
        {
          x: '50%',
          y: '50%',
          r: '15%',
          background: '#FF6B6B',
          shadow: '0 3px 10px rgba(255, 107, 107, 0.3)',
          fonts: [
            {
              text: '开始',
              color: '#FFFFFF',
              size: 18,
              fontWeight: 'bold'
            }
          ]
        }
      ],
      defaultStyle: {
        fontSize: 12,
        color: '#FFFFFF'
      }
    };

  if (!lotteryConfig) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🎯</div>
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
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 bg-gradient-to-b from-purple-50 to-indigo-100">
      {/* 主容器 */}
      <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-purple-100">
        {/* 顶部装饰条 */}
        <div className="h-3 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>
        
        {/* 标题区域 */}
        <div className="relative p-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-3">
            {lotteryConfig.name}
          </h2>
          
          {/* 装饰星星 */}
          <div className="absolute top-6 left-8 text-yellow-400 opacity-70 animate-pulse">
            <Star size={20} />
          </div>
          <div className="absolute top-6 right-8 text-yellow-400 opacity-70 animate-pulse" style={{ animationDelay: '0.5s' }}>
            <Star size={20} />
          </div>
          
          {lotteryConfig.description && (
            <p className="text-gray-600 text-center mb-2 text-lg leading-relaxed">
              {lotteryConfig.description}
            </p>
          )}
        </div>

        {/* 大转盘显示区域 */}
        <div className="relative w-full max-w-md mx-auto px-4 mb-10">
          {/* 转盘底座 */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transform scale-105 opacity-10 blur-md"></div>
          
          {/* 使用lucky-canvas大转盘组件 */}
          <div style={{ width: '100%', height: 350 }}>
            <LuckyCanvasWheel
              width="100%"
              height={350}
              config={{
                ...config,
                onStart,
                onEnd
              }}
              onClick={() => !isSpinning && handleSpin()}
              disabled={isSpinning || !hasEnoughPoints()}
              onInit={(instance) => {
                wheelRef.current = instance;
              }}
            />
          </div>
          
          {/* 指针 */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
            <div className="w-12 h-24 bg-gradient-to-b from-red-500 to-red-600 rounded-b-xl border-2 border-red-700 flex items-center justify-center shadow-lg">
              <Trophy className="text-white" size={28} />
            </div>
            {/* 指针底座 */}
            <div className="absolute bottom-0 w-20 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transform -translate-x-1/4 -translate-y-1/2 z-[-1]"></div>
          </div>
        </div>

        {/* 抽奖按钮 */}
        <div className="flex flex-col items-center mb-8 px-6">
          <button
            onClick={handleSpin}
            disabled={!hasEnoughPoints() || isSpinning}
            className={`w-full max-w-xs px-12 py-5 rounded-full text-white font-bold transition-all duration-300 transform text-lg flex items-center justify-center ${!hasEnoughPoints()
              ? 'bg-gray-300 cursor-not-allowed' 
              : isSpinning 
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 animate-pulse' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:scale-105 hover:shadow-lg'}`}
          >
            {!hasEnoughPoints() 
              ? <><Coins size={18} className="mr-2" /> 积分不足</>
              : isSpinning 
                ? <><RefreshCw size={18} className="mr-2 animate-spin" /> 抽奖中...</>
                : <><Award size={18} className="mr-2" /> 开始抽奖</>
            }
          </button>
          
          {/* 积分信息卡片 */}
          <div className="mt-4 w-full max-w-xs bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-purple-800">消耗</span>
              <span className="text-sm font-bold text-purple-700">
                {getPointIcon(lotteryConfig.cost_type)} {lotteryConfig.cost_amount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-purple-800">当前余额</span>
              <span className="text-sm font-bold text-green-600">
                {getPointIcon(lotteryConfig.cost_type)} 
                {userData.points[lotteryConfig.cost_type as keyof typeof userData.points]}
              </span>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 shadow-sm">
            <div className="flex items-center">
              <div className="text-red-500 mr-2">⚠️</div>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* 结果展示 - 模态卡片 */}
        {showResult && prizeResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-md w-full rounded-2xl overflow-hidden transform transition-all duration-300 scale-100`} style={{ 
              background: prizeResult.is_special 
                ? 'linear-gradient(135deg, #fff3cd, #ffeaa7, #fff3cd)' 
                : 'linear-gradient(135deg, #e8f5e9, #c3e6cb, #e8f5e9)',
              border: `2px solid ${prizeResult.is_special ? '#ffd700' : '#c3e6cb'}`
            }}>
              {/* 奖励卡片头部 */}
              <div className="p-6 text-center border-b border-opacity-30" style={{ borderColor: prizeResult.is_special ? '#ffd700' : '#c3e6cb' }}>
                <h3 className="text-2xl font-bold mb-2 text-center" style={{ color: prizeResult.is_special ? '#856404' : '#155724' }}>
                  恭喜获得!
                </h3>
                <div className="flex justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="text-yellow-400" 
                      size={20} 
                      fill="#FFD700"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
              
              {/* 奖励内容 */}
              <div className="p-8">
                <div className="flex flex-col items-center">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-lg ${prizeResult.is_special ? 'bg-gradient-to-br from-yellow-300 to-yellow-500' : 'bg-white'}`}>
                    <span className="text-8xl">{prizeResult.icon}</span>
                  </div>
                  <h4 className="text-2xl font-bold mb-2" style={{ color: prizeResult.is_special ? '#856404' : '#155724' }}>
                    {prizeResult.name}
                  </h4>
                  {prizeResult.description && (
                    <p className="text-gray-600 mt-2 text-center max-w-xs">{prizeResult.description}</p>
                  )}
                  {prizeResult.type === 'point' && prizeResult.point_type && prizeResult.point_amount && (
                    <p className="mt-6 text-xl font-bold" style={{ color: prizeResult.is_special ? '#856404' : '#28a745' }}>
                      {getPointIcon(prizeResult.point_type)} {prizeResult.point_amount}
                    </p>
                  )}
                </div>
              </div>
              
              {/* 按钮区域 */}
              <div className="p-4 flex justify-center">
                <button
                  onClick={resetResult}
                  className="px-8 py-3 rounded-full font-bold transition-all duration-300 transform"
                  style={{ 
                    background: prizeResult.is_special 
                      ? 'linear-gradient(135deg, #f0ad4e, #ec971f)' 
                      : 'linear-gradient(135deg, #28a745, #218838)',
                    color: 'white'
                  }}
                >
                  太棒了！
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 奖品概率展示 */}
        <div className="mt-2 mb-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent w-full"></div>
            <h3 className="text-lg font-semibold px-4 text-purple-700">奖品概率</h3>
            <div className="h-px bg-gradient-to-r from-purple-300 via-purple-300 to-transparent w-full"></div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {lotteryConfig.prizes.map((prize) => (
              <div 
                key={prize.id} 
                className={`flex items-center p-3 rounded-xl transition-all duration-300 hover:shadow-md ${prize.is_special ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' : 'bg-white'}`}
                style={{ 
                  border: `2px solid ${prize.is_special ? '#ffd700' : '#f0f0f0'}`,
                  boxShadow: prize.is_special ? '0 0 15px rgba(255, 215, 0, 0.2)' : 'none'
                }}
              >
                <span className="text-3xl mr-3">{prize.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium truncate ${prize.is_special ? 'text-yellow-800' : 'text-gray-700'}`}>
                    {prize.name}
                  </p>
                  <p className={`text-xs font-bold ${prize.is_special ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {formatProbability(prize.probability)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotteryWheel;