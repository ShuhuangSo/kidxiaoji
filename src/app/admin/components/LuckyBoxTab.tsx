import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LuckyBox {
  id: number;
  name: string;
  description: string;
  cost_type: 'coin' | 'diamond' | 'energy';
  cost_amount: number;
  icon: string;
  is_active: boolean;
  is_hidden: boolean;
  items: LuckyBoxItem[];
}

interface LuckyBoxItem {
  id: number;
  item_type: 'points' | 'product';
  item_value: number;
  item_detail?: string;
  probability: number;
  product_name?: string;
  product_icon?: string;
  product_description?: string;
}

interface Product {
  id: number;
  name: string;
  icon: string;
  description: string;
}

function LuckyBoxTab() {
  const [luckyBoxes, setLuckyBoxes] = useState<LuckyBox[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [showEditBoxModal, setShowEditBoxModal] = useState(false);
  const [editingBox, setEditingBox] = useState<LuckyBox | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LuckyBoxItem | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [expandedBoxId, setExpandedBoxId] = useState<number | null>(null);
  const [newBox, setNewBox] = useState({
    name: '',
    description: '',
    cost_type: 'diamond' as 'coin' | 'diamond' | 'energy',
    cost_amount: 0,
    icon: '🎁',
    is_active: true,
    is_hidden: false
  });
  const [newItem, setNewItem] = useState({
    item_type: 'points' as 'points' | 'product',
    item_value: 10,
    point_type: 'coin' as 'coin' | 'diamond' | 'energy',
    probability: 10
  });

  // 获取盲盒列表
  const fetchLuckyBoxes = async () => {
    try {
      const response = await fetch('/api/admin/lucky-box');
      const data = await response.json();
      setLuckyBoxes(data);
    } catch (error) {
      console.error('获取盲盒列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取普通商品列表
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/rewards');
      const data = await response.json();
      setProducts(data.filter((p: Product) => !p.name.includes('神秘盲盒') && !p.name.includes('盲盒')));
    } catch (error) {
      console.error('获取商品列表失败:', error);
    }
  };

  // 添加盲盒
  const handleAddBox = async () => {
    try {
      const response = await fetch('/api/admin/lucky-box', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBox)
      });
      const data = await response.json();
      setLuckyBoxes([...luckyBoxes, data]);
      setShowAddBoxModal(false);
      setNewBox({
        name: '',
        description: '',
        cost_type: 'diamond',
        cost_amount: 0,
        icon: '🎁',
        is_active: true,
        is_hidden: false
      });
    } catch (error) {
      console.error('添加盲盒失败:', error);
    }
  };

  // 更新盲盒
  const handleUpdateBox = async () => {
    if (!editingBox) return;
    try {
      const response = await fetch('/api/admin/lucky-box', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingBox.id,
          ...newBox
        })
      });
      await response.json();
      setLuckyBoxes(luckyBoxes.map(box => box.id === editingBox.id ? { ...box, ...newBox } : box));
      setShowEditBoxModal(false);
      setEditingBox(null);
    } catch (error) {
      console.error('更新盲盒失败:', error);
    }
  };

  // 删除盲盒
  const handleDeleteBox = async (boxId: number) => {
    if (window.confirm('确定要删除这个盲盒吗？相关的奖品配置也会被删除。')) {
      try {
        const response = await fetch(`/api/admin/lucky-box?id=${boxId}`, {
          method: 'DELETE'
        });
        await response.json();
        setLuckyBoxes(luckyBoxes.filter(box => box.id !== boxId));
      } catch (error) {
        console.error('删除盲盒失败:', error);
      }
    }
  };

  // 添加奖品
  const handleAddItem = async () => {
    if (!selectedBoxId) return;
    try {
      const itemDetail = newItem.item_type === 'points' 
        ? JSON.stringify({ point_type: newItem.point_type })
        : '';
      
      const response = await fetch('/api/admin/lucky-box/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          luckyBoxId: selectedBoxId,
          item_type: newItem.item_type,
          item_value: newItem.item_value,
          item_detail: itemDetail,
          probability: newItem.probability
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`添加奖品失败: ${errorData.message || '未知错误'}`);
        return;
      }
      
      const data = await response.json();
      
      // 更新盲盒的奖品列表
      setLuckyBoxes(luckyBoxes.map(box => {
        if (box.id === selectedBoxId) {
          return {
            ...box,
            items: [...(box.items || []), data]
          };
        }
        return box;
      }));
      
      setShowItemModal(false);
      setNewItem({
        item_type: 'points',
        item_value: 10,
        point_type: 'coin',
        probability: 10
      });
    } catch (error) {
      console.error('添加奖品失败:', error);
      alert('添加奖品失败，请重试');
    }
  };

  // 更新奖品
  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      const itemDetail = newItem.item_type === 'points' 
        ? JSON.stringify({ point_type: newItem.point_type })
        : '';
      
      const response = await fetch('/api/admin/lucky-box/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingItem.id,
          item_type: newItem.item_type,
          item_value: newItem.item_value,
          item_detail: itemDetail,
          probability: newItem.probability
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`更新奖品失败: ${errorData.message || '未知错误'}`);
        return;
      }
      
      const data = await response.json();
      
      // 更新盲盒的奖品列表
      setLuckyBoxes(luckyBoxes.map(box => ({
        ...box,
        items: box.items.map(item => item.id === editingItem?.id ? data : item)
      })));
      
      setShowItemModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('更新奖品失败:', error);
      alert('更新奖品失败，请重试');
    }
  };

  // 删除奖品
  const handleDeleteItem = async (itemId: number, boxId: number) => {
    if (window.confirm('确定要删除这个奖品吗？')) {
      try {
        const response = await fetch(`/api/admin/lucky-box/items?id=${itemId}`, {
          method: 'DELETE'
        });
        await response.json();
        
        // 更新盲盒的奖品列表
        setLuckyBoxes(luckyBoxes.map(box => {
          if (box.id === boxId) {
            return {
              ...box,
              items: box.items.filter(item => item.id !== itemId)
            };
          }
          return box;
        }));
      } catch (error) {
        console.error('删除奖品失败:', error);
      }
    }
  };

  // 切换盲盒状态
  const toggleBoxStatus = async (boxId: number, currentStatus: boolean) => {
    try {
      const box = luckyBoxes.find(b => b.id === boxId);
      if (!box) return;
      
      const response = await fetch('/api/admin/lucky-box', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...box,
          is_active: !currentStatus
        })
      });
      await response.json();
      
      setLuckyBoxes(luckyBoxes.map(b => 
        b.id === boxId ? { ...b, is_active: !currentStatus } : b
      ));
    } catch (error) {
      console.error('切换盲盒状态失败:', error);
    }
  };

  // 打开编辑盲盒模态框
  const openEditBoxModal = (box: LuckyBox) => {
    setEditingBox(box);
    setNewBox({
      name: box.name,
      description: box.description,
      cost_type: box.cost_type,
      cost_amount: box.cost_amount,
      icon: box.icon,
      is_active: box.is_active,
      is_hidden: box.is_hidden
    });
    setShowEditBoxModal(true);
  };

  // 打开添加奖品模态框
  const openAddItemModal = (boxId: number) => {
    setSelectedBoxId(boxId);
    setEditingItem(null);
    setNewItem({
      item_type: 'points',
      item_value: 10,
      point_type: 'coin',
      probability: 10
    });
    setShowItemModal(true);
  };

  // 打开编辑奖品模态框
  const openEditItemModal = (item: LuckyBoxItem, boxId: number) => {
    setSelectedBoxId(boxId);
    setEditingItem(item);
    const itemDetail = item.item_detail ? JSON.parse(item.item_detail) : {};
    setNewItem({
      item_type: item.item_type,
      item_value: item.item_value,
      point_type: (itemDetail.point_type as 'coin' | 'diamond' | 'energy') || 'coin',
      probability: item.probability
    });
    setShowItemModal(true);
  };

  // 切换盲盒展开状态
  const toggleBoxExpand = (boxId: number) => {
    setExpandedBoxId(expandedBoxId === boxId ? null : boxId);
  };

  useEffect(() => {
    fetchLuckyBoxes();
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">神秘盲盒管理</h2>
        <button
          onClick={() => setShowAddBoxModal(true)}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="inline-block mr-2 h-4 w-4" /> 添加盲盒
        </button>
      </div>

      <div className="space-y-4">
        {luckyBoxes.map((box) => (
          <div key={box.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 md:p-6 cursor-pointer" onClick={() => toggleBoxExpand(box.id)}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-4 w-full md:w-auto">
                  <div className="text-3xl md:text-4xl">{box.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-800">{box.name}</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">{box.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                  <div className={`text-base md:text-lg font-bold ${box.cost_type === 'coin' ? 'text-yellow-600' : box.cost_type === 'diamond' ? 'text-purple-600' : 'text-green-600'}`}>
                    {box.cost_amount} {box.cost_type === 'coin' ? '金币' : box.cost_type === 'diamond' ? '钻石' : '能量'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBoxStatus(box.id, box.is_active);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${box.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {box.is_active ? '上架' : '下架'}
                  </button>
                  <button
                    className="p-1 rounded-full hover:bg-gray-100"
                    aria-label={expandedBoxId === box.id ? '收起' : '展开'}
                  >
                    {expandedBoxId === box.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {expandedBoxId === box.id && (
              <div className="px-4 md:px-6 pb-6">
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">奖品配置</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditBoxModal(box);
                      }}
                      className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex-1 min-w-[100px] justify-center"
                    >
                      <Edit className="inline-block mr-1 h-3 w-3" /> 编辑盲盒
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddItemModal(box.id);
                      }}
                      className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex-1 min-w-[100px] justify-center"
                    >
                      <Plus className="inline-block mr-1 h-3 w-3" /> 添加奖品
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBox(box.id);
                      }}
                      className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex-1 min-w-[100px] justify-center"
                    >
                      <Trash2 className="inline-block mr-1 h-3 w-3" /> 删除盲盒
                    </button>
                  </div>
                </div>

                {box.items.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <AlertCircle size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">暂无奖品配置</p>
                  </div>
                ) : (
                  <>
                    {/* 桌面端表格视图 */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖品类型</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖品内容</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">概率 (%)</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {box.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.item_type === 'points' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {item.item_type === 'points' ? '积分' : '商品'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.item_type === 'points' ? (
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {(() => {
                                        const detail = item.item_detail ? JSON.parse(item.item_detail) : {};
                                        const pointType = detail.point_type || 'coin';
                                        return `${item.item_value} ${pointType === 'coin' ? '金币' : pointType === 'diamond' ? '钻石' : '能量'}`;
                                      })()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <div className="text-2xl mr-3">{item.product_icon || '📦'}</div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{item.product_name || '未知商品'}</div>
                                      <div className="text-xs text-gray-500">{item.product_description || ''}</div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.probability}%</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => openEditItemModal(item, box.id)}
                                    className="text-blue-600 hover:text-blue-900 p-1"
                                    aria-label="编辑"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, box.id)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                    aria-label="删除"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 手机端卡片视图 */}
                    <div className="md:hidden space-y-3">
                      {box.items.map((item) => {
                        const detail = item.item_detail ? JSON.parse(item.item_detail) : {};
                        const pointType = detail.point_type || 'coin';
                        
                        return (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.item_type === 'points' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                {item.item_type === 'points' ? '积分' : '商品'}
                              </span>
                              <div className="text-sm font-medium text-gray-900">{item.probability}%</div>
                            </div>
                            
                            {item.item_type === 'points' ? (
                              <div className="text-sm font-medium text-gray-900 mb-3">
                                {item.item_value} {pointType === 'coin' ? '金币' : pointType === 'diamond' ? '钻石' : '能量'}
                              </div>
                            ) : (
                              <div className="flex items-center mb-3">
                                <div className="text-2xl mr-3">{item.product_icon || '📦'}</div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{item.product_name || '未知商品'}</div>
                                  <div className="text-xs text-gray-500 truncate">{item.product_description || ''}</div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-end space-x-4">
                              <button
                                onClick={() => openEditItemModal(item, box.id)}
                                className="flex items-center text-blue-600 hover:text-blue-900 p-1"
                                aria-label="编辑"
                              >
                                <Edit size={16} className="mr-1" />
                                <span className="text-xs">编辑</span>
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, box.id)}
                                className="flex items-center text-red-600 hover:text-red-900 p-1"
                                aria-label="删除"
                              >
                                <Trash2 size={16} className="mr-1" />
                                <span className="text-xs">删除</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 添加盲盒模态框 */}
      {showAddBoxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">添加盲盒</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">盲盒名称</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.name}
                  onChange={(e) => setNewBox({...newBox, name: e.target.value})}
                  placeholder="例如：神秘盲盒"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.description}
                  onChange={(e) => setNewBox({...newBox, description: e.target.value})}
                  placeholder="盲盒描述"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">兑换类型</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.cost_type}
                  onChange={(e) => setNewBox({...newBox, cost_type: e.target.value as 'coin' | 'diamond' | 'energy'})}
                >
                  <option value="coin">金币</option>
                  <option value="diamond">钻石</option>
                  <option value="energy">能量</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">兑换数量</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.cost_amount}
                  onChange={(e) => setNewBox({...newBox, cost_amount: parseInt(e.target.value) || 0})}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.icon}
                  onChange={(e) => setNewBox({...newBox, icon: e.target.value})}
                  placeholder="输入emoji图标，例如：🎁"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="add-box-is-active"
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  checked={newBox.is_active}
                  onChange={(e) => setNewBox({...newBox, is_active: e.target.checked})}
                />
                <label htmlFor="add-box-is-active" className="ml-2 block text-sm text-gray-700">
                  立即上架
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="add-box-is-hidden"
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  checked={newBox.is_hidden}
                  onChange={(e) => setNewBox({...newBox, is_hidden: e.target.checked})}
                />
                <label htmlFor="add-box-is-hidden" className="ml-2 block text-sm text-gray-700">
                  隐藏盲盒（用户端不可见）
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddBoxModal(false);
                  setNewBox({
                    name: '',
                    description: '',
                    cost_type: 'diamond',
                    cost_amount: 0,
                    icon: '🎁',
                    is_active: true,
                    is_hidden: false
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <X className="inline-block mr-1 h-4 w-4" /> 取消
              </button>
              <button
                onClick={handleAddBox}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="inline-block mr-1 h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑盲盒模态框 */}
      {showEditBoxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">编辑盲盒</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">盲盒名称</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.name}
                  onChange={(e) => setNewBox({...newBox, name: e.target.value})}
                  placeholder="例如：神秘盲盒"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.description}
                  onChange={(e) => setNewBox({...newBox, description: e.target.value})}
                  placeholder="盲盒描述"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">兑换类型</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.cost_type}
                  onChange={(e) => setNewBox({...newBox, cost_type: e.target.value as 'coin' | 'diamond' | 'energy'})}
                >
                  <option value="coin">金币</option>
                  <option value="diamond">钻石</option>
                  <option value="energy">能量</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">兑换数量</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.cost_amount}
                  onChange={(e) => setNewBox({...newBox, cost_amount: parseInt(e.target.value) || 0})}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newBox.icon}
                  onChange={(e) => setNewBox({...newBox, icon: e.target.value})}
                  placeholder="输入emoji图标，例如：🎁"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-box-is-active"
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  checked={newBox.is_active}
                  onChange={(e) => setNewBox({...newBox, is_active: e.target.checked})}
                />
                <label htmlFor="edit-box-is-active" className="ml-2 block text-sm text-gray-700">
                  上架
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-box-is-hidden"
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  checked={newBox.is_hidden}
                  onChange={(e) => setNewBox({...newBox, is_hidden: e.target.checked})}
                />
                <label htmlFor="edit-box-is-hidden" className="ml-2 block text-sm text-gray-700">
                  隐藏盲盒（用户端不可见）
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditBoxModal(false);
                  setEditingBox(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <X className="inline-block mr-1 h-4 w-4" /> 取消
              </button>
              <button
                onClick={handleUpdateBox}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="inline-block mr-1 h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 奖品配置模态框 */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editingItem ? '编辑奖品' : '添加奖品'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">奖品类型</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newItem.item_type}
                  onChange={(e) => setNewItem({...newItem, item_type: e.target.value as 'points' | 'product'})}
                >
                  <option value="points">积分</option>
                  <option value="product">商品</option>
                </select>
              </div>
              
              {newItem.item_type === 'points' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">积分类型</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      value={newItem.point_type}
                      onChange={(e) => setNewItem({...newItem, point_type: e.target.value as 'coin' | 'diamond' | 'energy'})}
                    >
                      <option value="coin">金币</option>
                      <option value="diamond">钻石</option>
                      <option value="energy">能量</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">积分数量</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      value={newItem.item_value}
                      onChange={(e) => setNewItem({...newItem, item_value: parseInt(e.target.value) || 0})}
                      min="1"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    value={newItem.item_value || ''}
                    onChange={(e) => {
                      const selectedValue = parseInt(e.target.value) || 0;
                      setNewItem({...newItem, item_value: selectedValue});
                    }}
                  >
                    <option value="">请选择商品</option>
                    {products.length > 0 ? (
                      products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.icon} {product.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>暂无可用商品</option>
                    )}
                  </select>
                  {products.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">请先添加商品再配置盲盒奖品</p>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中奖概率 (%)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  value={newItem.probability}
                  onChange={(e) => setNewItem({...newItem, probability: parseFloat(e.target.value) || 0})}
                  min="0.1"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">所有奖品的概率总和建议为100%</p>
                {editingItem && (
                  <p className="text-xs text-blue-600 mt-1">当前奖品概率: {editingItem.probability}%</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  setNewItem({
                    item_type: 'points',
                    item_value: 10,
                    point_type: 'coin',
                    probability: 10
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <X className="inline-block mr-1 h-4 w-4" /> 取消
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                disabled={newItem.item_type === 'product' && (!newItem.item_value || newItem.item_value === 0)}
                className={`px-4 py-2 rounded-lg transition-colors ${newItem.item_type === 'product' && (!newItem.item_value || newItem.item_value === 0) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
              >
                <Save className="inline-block mr-1 h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LuckyBoxTab;