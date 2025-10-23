import React, { useState, useEffect } from 'react';
import { Award, Calendar, Store, Plus, Trash2, Gift, Gem, Battery, Coins } from 'lucide-react';

interface DateReward {
  id: number;
  date: string;
  reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
  reward_amount: number;
  product_id?: number;
  product_name?: string;
}

interface StreakLengthReward {
  id: number;
  cycle_type: 'cycle' | 'specific';
  cycle_days: number;
  reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
  reward_amount: number;
  product_id?: number;
  product_name?: string;
}

interface Product {
  id: number;
  name: string;
  icon: string;
}

function StreakRewardsTab() {
  // 日期奖励相关状态
  const [dateRewards, setDateRewards] = useState<DateReward[]>([]);
  const [showDateRewardModal, setShowDateRewardModal] = useState(false);
  const [editingDateReward, setEditingDateReward] = useState<DateReward | null>(null);
  const [newDateReward, setNewDateReward] = useState<{
    date: string;
    reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
    reward_amount: number;
    product_id: number | undefined;
  }>({
    date: '',
    reward_type: 'coins',
    reward_amount: 0,
    product_id: undefined
  });

  // 连胜天数奖励相关状态
  const [streakLengthRewards, setStreakLengthRewards] = useState<StreakLengthReward[]>([]);
  const [showStreakRewardModal, setShowStreakRewardModal] = useState(false);
  const [editingStreakReward, setEditingStreakReward] = useState<StreakLengthReward | null>(null);
  const [newStreakReward, setNewStreakReward] = useState<{
    cycle_type: 'cycle' | 'specific';
    cycle_days: number;
    reward_type: 'coins' | 'diamonds' | 'energy' | 'product';
    reward_amount: number;
    product_id: number | undefined;
  }>({
    cycle_type: 'cycle',
    cycle_days: 0,
    reward_type: 'coins',
    reward_amount: 0,
    product_id: undefined
  });

  // 通用状态
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'date' | 'streak'>('date');

  // 加载数据
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 并行请求所有数据
      const [dateRewardsRes, streakRewardsRes, productsRes] = await Promise.all([
        fetch('/api/admin/streak-rewards/date'),
        fetch('/api/admin/streak-rewards/streak'),
        fetch('/api/admin/rewards')
      ]);

      const dateRewardsData = await dateRewardsRes.json();
      const streakRewardsData = await streakRewardsRes.json();
      const productsData = await productsRes.json();

      if (dateRewardsData.success) {
        setDateRewards(dateRewardsData.rewards || []);
      }

      if (streakRewardsData.success) {
        setStreakLengthRewards(streakRewardsData.rewards || []);
      }

      // 处理管理端API返回的商品数据
      if (productsData && productsData.rewards) {
        setProducts(productsData.rewards || []);
      } else if (Array.isArray(productsData)) {
        // 兼容可能的不同返回格式
        setProducts(productsData || []);
      }
    } catch (err) {
      setError('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 处理日期奖励保存
  const handleSaveDateReward = async () => {
    if (!newDateReward.date) {
      setError('请选择日期');
      return;
    }

    if (newDateReward.reward_type !== 'product' && newDateReward.reward_amount <= 0) {
      setError('请设置有效的奖励数量');
      return;
    }

    if (newDateReward.reward_type === 'product' && !newDateReward.product_id) {
      setError('请选择产品');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const method = editingDateReward ? 'PUT' : 'POST';
      const url = editingDateReward 
        ? `/api/admin/streak-rewards/date/${editingDateReward.id}`
        : '/api/admin/streak-rewards/date';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDateReward)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingDateReward ? '日期奖励更新成功' : '日期奖励添加成功');
        await loadAllData();
        resetDateRewardForm();
      } else {
        setError(data.message || '操作失败');
      }
    } catch (err) {
      setError('操作时发生错误');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 处理连胜天数奖励保存
  const handleSaveStreakReward = async () => {
    if (newStreakReward.cycle_days <= 0) {
      setError('请设置有效的周期天数');
      return;
    }

    if (newStreakReward.reward_type !== 'product' && newStreakReward.reward_amount <= 0) {
      setError('请设置有效的奖励数量');
      return;
    }

    if (newStreakReward.reward_type === 'product' && !newStreakReward.product_id) {
      setError('请选择产品');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const method = editingStreakReward ? 'PUT' : 'POST';
      const url = editingStreakReward 
        ? `/api/admin/streak-rewards/streak/${editingStreakReward.id}`
        : '/api/admin/streak-rewards/streak';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStreakReward)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingStreakReward ? '连胜奖励更新成功' : '连胜奖励添加成功');
        await loadAllData();
        resetStreakRewardForm();
      } else {
        setError(data.message || '操作失败');
      }
    } catch (err) {
      setError('操作时发生错误');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 删除日期奖励
  const handleDeleteDateReward = async (id: number) => {
    if (confirm('确定要删除这个日期奖励吗？')) {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/streak-rewards/date/${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          setSuccess('日期奖励删除成功');
          await loadAllData();
        } else {
          setError(data.message || '删除失败');
        }
      } catch (err) {
        setError('删除时发生错误');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 删除连胜天数奖励
  const handleDeleteStreakReward = async (id: number) => {
    if (confirm('确定要删除这个连胜奖励吗？')) {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/streak-rewards/streak/${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          setSuccess('连胜奖励删除成功');
          await loadAllData();
        } else {
          setError(data.message || '删除失败');
        }
      } catch (err) {
        setError('删除时发生错误');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 编辑日期奖励
  const handleEditDateReward = (reward: DateReward) => {
    setEditingDateReward(reward);
    setNewDateReward({
      date: reward.date,
      reward_type: reward.reward_type,
      reward_amount: reward.reward_amount,
      product_id: reward.product_id
    });
    setShowDateRewardModal(true);
  };

  // 编辑连胜天数奖励
  const handleEditStreakReward = (reward: StreakLengthReward) => {
    setEditingStreakReward(reward);
    setNewStreakReward({
      cycle_type: reward.cycle_type || 'cycle',
      cycle_days: reward.cycle_days,
      reward_type: reward.reward_type,
      reward_amount: reward.reward_amount,
      product_id: reward.product_id
    });
    setShowStreakRewardModal(true);
  };

  // 重置日期奖励表单
  const resetDateRewardForm = () => {
    setEditingDateReward(null);
    setNewDateReward({
      date: '',
      reward_type: 'coins',
      reward_amount: 0,
      product_id: undefined
    });
    setShowDateRewardModal(false);
  };

  // 重置连胜奖励表单
  const resetStreakRewardForm = () => {
    setEditingStreakReward(null);
    setNewStreakReward({
      cycle_type: 'cycle',
      cycle_days: 0,
      reward_type: 'coins',
      reward_amount: 0,
      product_id: undefined
    });
    setShowStreakRewardModal(false);
  };

  // 获取奖励类型图标
  const getRewardTypeIcon = (type: string, amount?: number) => {
    const iconProps = { className: 'w-5 h-5 mr-1' };
    
    switch (type) {
      case 'coins':
        return <Coins {...iconProps} className={`${iconProps.className} text-yellow-500`} />;
      case 'diamonds':
        return <Gem {...iconProps} className={`${iconProps.className} text-blue-500`} />;
      case 'energy':
        return <Battery {...iconProps} className={`${iconProps.className} text-green-500`} />;
      case 'product':
        return <Gift {...iconProps} className={`${iconProps.className} text-purple-500`} />;
      default:
        return <Award {...iconProps} />;
    }
  };

  // 获取奖励类型名称
  const getRewardTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      coins: '金币',
      diamonds: '钻石',
      energy: '能量',
      product: '商品'
    };
    return names[type] || type;
  };

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading && (!dateRewards.length && !streakLengthRewards.length)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Award className="mr-2 text-purple-600" />
        连胜奖励管理
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

      {/* 子标签页切换 */}
      <div className="flex space-x-2 mb-4 border-b">
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'date' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('date')}
        >
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>日期奖励</span>
          </div>
        </button>
        <button
          className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'streak' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('streak')}
        >
          <div className="flex items-center space-x-1">
            <Award size={16} />
            <span>周期奖励</span>
          </div>
        </button>
      </div>

      {/* 日期奖励内容 */}
      {activeTab === 'date' && (
        <div>
          {/* 添加按钮 */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowDateRewardModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} className="mr-1" />
              添加奖励
            </button>
          </div>

          {/* 日期奖励列表 */}
            {dateRewards.length > 0 ? (
              <>
                {/* 移动端卡片列表 */}
                <div className="space-y-3 mb-4 md:hidden">
                  {dateRewards.map(reward => (
                    <div key={reward.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-medium text-gray-900">{formatDate(reward.date)}</h3>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">奖励类型</span>
                          <div className="flex items-center">
                            {getRewardTypeIcon(reward.reward_type)}
                            <span className="ml-1 text-sm text-gray-700">{getRewardTypeName(reward.reward_type)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-500">奖励内容</span>
                          <span className="text-sm text-gray-700 font-medium">
                            {reward.reward_type === 'product' ? 
                              `${reward.product_name || '未知商品'}` : 
                              `${reward.reward_amount}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleEditDateReward(reward)}
                            className="p-1.5 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100"
                            title="编辑"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteDateReward(reward.id)}
                            className="p-1.5 bg-red-50 rounded-full text-red-600 hover:bg-red-100"
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 桌面端表格 */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-3 text-left text-base font-medium text-gray-700">日期</th>
                        <th className="border border-gray-200 px-4 py-3 text-left text-base font-medium text-gray-700">奖励类型</th>
                        <th className="border border-gray-200 px-4 py-3 text-left text-base font-medium text-gray-700">奖励内容</th>
                        <th className="border border-gray-200 px-4 py-3 text-center text-base font-medium text-gray-700">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateRewards.map(reward => (
                        <tr key={reward.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3 text-base text-gray-900">{formatDate(reward.date)}</td>
                          <td className="border border-gray-200 px-4 py-3">
                            <div className="flex items-center">
                              {getRewardTypeIcon(reward.reward_type)}
                              <span className="text-base text-gray-700">{getRewardTypeName(reward.reward_type)}</span>
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-base text-gray-700">
                            {reward.reward_type === 'product' ? 
                              `${reward.product_name || '未知商品'}` : 
                              `${reward.reward_amount}`
                            }
                          </td>
                          <td className="border border-gray-200 px-4 py-3">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleEditDateReward(reward)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-full"
                                title="编辑"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteDateReward(reward.id)}
                                className="text-red-600 hover:text-red-800 p-2 rounded-full"
                                title="删除"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              暂无日期奖励设置
            </div>
          )}

          {/* 添加/编辑日期奖励模态框 */}
          {showDateRewardModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-full md:max-w-md p-4 overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-bold text-gray-800 mb-5">
                  {editingDateReward ? '编辑日期奖励' : '添加日期奖励'}
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                    <input
                      type="date"
                      className="w-full min-w-full max-w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none"
                      value={newDateReward.date}
                      onChange={(e) => setNewDateReward({...newDateReward, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">奖励类型</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={newDateReward.reward_type}
                      onChange={(e) => setNewDateReward({
                        ...newDateReward, 
                        reward_type: e.target.value as any,
                        product_id: e.target.value === 'product' ? newDateReward.product_id : undefined,
                        reward_amount: e.target.value === 'product' ? 0 : newDateReward.reward_amount
                      })}
                    >
                      <option value="coins">金币</option>
                      <option value="diamonds">钻石</option>
                      <option value="energy">能量</option>
                      <option value="product">商品</option>
                    </select>
                  </div>
                  
                  {(newDateReward.reward_type !== 'product') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {getRewardTypeName(newDateReward.reward_type)}数量
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={newDateReward.reward_amount}
                        onChange={(e) => setNewDateReward({...newDateReward, reward_amount: parseInt(e.target.value) || 0})}
                        min="1"
                      />
                    </div>
                  )}
                  
                  {(newDateReward.reward_type === 'product') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={newDateReward.product_id || ''}
                        onChange={(e) => setNewDateReward({...newDateReward, product_id: parseInt(e.target.value) || undefined})}
                      >
                        <option value="" disabled>请选择商品</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.icon || ''} {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 mt-6">
                  <button
                    onClick={resetDateRewardForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                    disabled={loading}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveDateReward}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 连胜天数奖励内容 */}
      {activeTab === 'streak' && (
        <div>
          {/* 添加按钮 */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowStreakRewardModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} className="mr-1" />
              添加奖励
            </button>
          </div>

          {/* 连胜天数奖励列表 */}
            {streakLengthRewards.length > 0 ? (
              <>
                {/* 移动端卡片列表 */}
                <div className="space-y-3 mb-4 md:hidden">
                  {streakLengthRewards
                    .sort((a, b) => a.cycle_days - b.cycle_days)
                    .map(reward => (
                      <div key={reward.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                          <h3 className="font-medium text-gray-900">每 {reward.cycle_days} 天</h3>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">奖励类型</span>
                            <div className="flex items-center">
                              {getRewardTypeIcon(reward.reward_type)}
                              <span className="ml-1 text-sm text-gray-700">{getRewardTypeName(reward.reward_type)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-500">奖励内容</span>
                            <span className="text-sm text-gray-700 font-medium">
                              {reward.reward_type === 'product' ? 
                                `${reward.product_name || '未知商品'}` : 
                                `${reward.reward_amount}`
                              }
                            </span>
                          </div>
                          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => handleEditStreakReward(reward)}
                              className="p-1.5 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100"
                              title="编辑"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteStreakReward(reward.id)}
                              className="p-1.5 bg-red-50 rounded-full text-red-600 hover:bg-red-100"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                
                {/* 桌面端表格 */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-3 text-left text-base font-medium text-gray-700">周期天数</th>
                        <th className="border border-gray-200 px-4 py-3 text-left text-base font-medium text-gray-700">奖励类型</th>
                        <th className="border border-gray-200 px-4 py-3 text-left text-base font-medium text-gray-700">奖励内容</th>
                        <th className="border border-gray-200 px-4 py-3 text-center text-base font-medium text-gray-700">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streakLengthRewards
                        .sort((a, b) => a.cycle_days - b.cycle_days)
                        .map(reward => (
                          <tr key={reward.id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-3 text-base font-medium text-gray-900">每 {reward.cycle_days} 天</td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="flex items-center">
                                {getRewardTypeIcon(reward.reward_type)}
                                <span className="text-base text-gray-700">{getRewardTypeName(reward.reward_type)}</span>
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-base text-gray-700">
                              {reward.reward_type === 'product' ? 
                                `${reward.product_name || '未知商品'}` : 
                                `${reward.reward_amount}`
                              }
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEditStreakReward(reward)}
                                  className="text-blue-600 hover:text-blue-800 p-2 rounded-full"
                                  title="编辑"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteStreakReward(reward.id)}
                                  className="text-red-600 hover:text-red-800 p-2 rounded-full"
                                  title="删除"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              暂无连胜天数奖励设置
            </div>
          )}

          {/* 添加/编辑连胜天数奖励模态框 */}
          {showStreakRewardModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-full md:max-w-md p-4 overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-bold text-gray-800 mb-5">
                  {editingStreakReward ? '编辑连胜奖励' : '添加连胜奖励'}
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">周期天数</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={newStreakReward.cycle_days}
                        onChange={(e) => setNewStreakReward({...newStreakReward, cycle_days: parseInt(e.target.value) || 0})}
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">奖励类型</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={newStreakReward.reward_type}
                      onChange={(e) => setNewStreakReward({
                        ...newStreakReward, 
                        reward_type: e.target.value as any,
                        product_id: e.target.value === 'product' ? newStreakReward.product_id : undefined,
                        reward_amount: e.target.value === 'product' ? 0 : newStreakReward.reward_amount
                      })}
                    >
                      <option value="coins">金币</option>
                      <option value="diamonds">钻石</option>
                      <option value="energy">能量</option>
                      <option value="product">商品</option>
                    </select>
                  </div>
                  
                  {(newStreakReward.reward_type !== 'product') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {getRewardTypeName(newStreakReward.reward_type)}数量
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={newStreakReward.reward_amount}
                        onChange={(e) => setNewStreakReward({...newStreakReward, reward_amount: parseInt(e.target.value) || 0})}
                        min="1"
                      />
                    </div>
                  )}
                  
                  {(newStreakReward.reward_type === 'product') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={newStreakReward.product_id || ''}
                        onChange={(e) => setNewStreakReward({...newStreakReward, product_id: parseInt(e.target.value) || undefined})}
                      >
                        <option value="" disabled>请选择商品</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.icon || ''} {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 mt-6">
                  <button
                    onClick={resetStreakRewardForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                    disabled={loading}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveStreakReward}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default StreakRewardsTab;