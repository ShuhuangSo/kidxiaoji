import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// 定义商品详情接口
interface ProductDetail {
  product_id: number | string;
  name?: string;
  icon?: string;
  description?: string;
  product_name?: string;
  product_icon?: string;
  product_description?: string;
}

// 定义积分详情接口
interface PointDetail {
  point_type: 'coin' | 'diamond' | 'energy';
  [key: string]: any;
}

// 定义奖品项接口
interface LuckyBoxItem {
  id: number;
  lucky_box_id?: number;
  item_type: 'product' | 'points';
  item_value: number | string;
  item_detail?: string | null;
  probability: number;
  product_name?: string;
  product_icon?: string;
  product_description?: string;
  created_at?: string;
  updated_at?: string;
}

// 获取指定盲盒的所有奖品
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const luckyBoxId = searchParams.get('luckyBoxId');
    
    if (!luckyBoxId) {
      return NextResponse.json(
        { message: '缺少盲盒ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    const items: LuckyBoxItem[] = await db.all(
      `SELECT l.id, l.item_type, l.item_value, l.item_detail, l.probability,
             CASE 
               WHEN l.item_type = 'product' THEN r.name 
               ELSE NULL 
             END as product_name,
             CASE 
               WHEN l.item_type = 'product' THEN r.icon 
               ELSE NULL 
             END as product_icon,
             CASE 
               WHEN l.item_type = 'product' THEN r.description 
               ELSE NULL 
             END as product_description
      FROM lucky_box_items l
      LEFT JOIN rewards r ON l.item_value = r.id AND l.item_type = 'product'
      WHERE l.lucky_box_id = ?
      ORDER BY l.probability DESC`,
      [luckyBoxId]
    );

    // 处理item_detail，确保前端能正确解析
    const processedItems = items.map((item: LuckyBoxItem) => {
      try {
        // 如果是商品类型但没有item_detail或格式不正确，创建一个
        if (item.item_type === 'product' && item.product_name) {
          // 尝试解析现有的item_detail
          let detailObj: ProductDetail | null = null;
          if (item.item_detail) {
            try {
              detailObj = typeof item.item_detail === 'string' ? JSON.parse(item.item_detail) : item.item_detail;
            } catch (e) {
              // 解析失败，创建新的
              detailObj = null;
            }
          }
          
          // 如果没有有效的item_detail对象，创建一个
          if (!detailObj || typeof detailObj !== 'object') {
            const newDetailObj: ProductDetail = {
              product_id: item.item_value,
              product_name: item.product_name,
              product_icon: item.product_icon,
              product_description: item.product_description
            };
            
            return {
              ...item,
              item_detail: JSON.stringify(newDetailObj)
            };
          }
        }
        return item;
      } catch (e) {
        console.error('处理奖品数据失败:', e);
        return item;
      }
    });
    
    return NextResponse.json(processedItems);
  } catch (error: any) {
    console.error('获取盲盒奖品失败:', error?.message || error);
    return NextResponse.json(
      { message: '服务器错误', error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// 添加新的盲盒奖品
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 兼容两种命名方式：前端使用下划线命名，后端使用驼峰命名
    const luckyBoxId = data.luckyBoxId || data.lucky_box_id;
    const itemType = data.itemType || data.item_type;
    const itemValue = data.itemValue || data.item_value;
    const itemDetail = data.itemDetail || data.item_detail;
    const probability = data.probability;
    
    if (!luckyBoxId || !itemType || itemValue === undefined || probability === undefined) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    if (probability <= 0 || probability > 100) {
      return NextResponse.json(
        { message: '概率必须在0到100之间' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 验证盲盒是否存在
    const boxExists: { id: number } | undefined = await db.get(
      'SELECT id FROM rewards WHERE id = ? AND is_lucky_box = true',
      [luckyBoxId]
    );
    
    if (!boxExists) {
      return NextResponse.json(
        { message: '盲盒不存在' },
        { status: 404 }
      );
    }
    
    // 处理item_detail
    let processedItemDetail: string = itemDetail ? JSON.stringify(itemDetail) : '';
    
    // 如果是商品类型，验证商品是否存在并获取商品信息
    if (itemType === 'product') {
      const productInfo: { id: number; name: string; icon: string; description: string } | undefined = await db.get(
        'SELECT id, name, icon, description FROM rewards WHERE id = ? AND is_lucky_box = false',
        [itemValue]
      );
      
      if (!productInfo) {
        return NextResponse.json(
          { message: '商品不存在' },
          { status: 404 }
        );
      }
      
      // 保存商品信息到item_detail
        const detailObj: ProductDetail = {
          product_id: productInfo.id,
          product_name: productInfo.name,
          product_icon: productInfo.icon,
          product_description: productInfo.description
        };
        
        processedItemDetail = JSON.stringify(detailObj);
    } else if (itemType === 'points' && itemDetail) {
        // 确保积分类型的数据结构正确
        try {
          const detailObj: PointDetail = typeof itemDetail === 'string' ? JSON.parse(itemDetail) : itemDetail as PointDetail;
          if (!detailObj.point_type || !['coin', 'diamond', 'energy'].includes(detailObj.point_type)) {
            return NextResponse.json(
              { message: '积分类型无效' },
              { status: 400 }
            );
          }
          processedItemDetail = JSON.stringify(detailObj);
        } catch (e) {
          return NextResponse.json(
            { message: 'itemDetail格式错误' },
            { status: 400 }
          );
        }
      }
    
    // 插入新奖品
    const result = await db.run(
      'INSERT INTO lucky_box_items (lucky_box_id, item_type, item_value, item_detail, probability) VALUES (?, ?, ?, ?, ?)',
      [luckyBoxId, itemType, itemValue, processedItemDetail, probability]
    );
    
    // 获取完整的奖品信息
    const newItem: LuckyBoxItem | undefined = await db.get(
      `SELECT l.id, l.item_type, l.item_value, l.item_detail, l.probability,
             CASE 
               WHEN l.item_type = 'product' THEN r.name 
               ELSE NULL 
             END as product_name,
             CASE 
               WHEN l.item_type = 'product' THEN r.icon 
               ELSE NULL 
             END as product_icon,
             CASE 
               WHEN l.item_type = 'product' THEN r.description 
               ELSE NULL 
             END as product_description
      FROM lucky_box_items l
      LEFT JOIN rewards r ON l.item_value = r.id AND l.item_type = 'product'
      WHERE l.id = ?`,
      [(result as any).lastID]
    );
    
    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error('添加盲盒奖品失败:', error?.message || error);
    return NextResponse.json(
      { message: '服务器错误', error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// 更新盲盒奖品
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 兼容两种命名方式：前端使用下划线命名，后端使用驼峰命名
    const id = data.id;
    const itemType = data.itemType || data.item_type;
    const itemValue = data.itemValue || data.item_value;
    const itemDetail = data.itemDetail || data.item_detail;
    const probability = data.probability;
    
    if (!id || !itemType || itemValue === undefined || probability === undefined) {
      return NextResponse.json(
        { message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    if (probability <= 0 || probability > 100) {
      return NextResponse.json(
        { message: '概率必须在0到100之间' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 处理item_detail
    let processedItemDetail: string = itemDetail ? JSON.stringify(itemDetail) : '';
    
    // 如果是商品类型，验证商品是否存在并获取商品信息
    if (itemType === 'product') {
      const productExists: { id: number; name: string; icon: string; description: string } | undefined = await db.get(
        'SELECT id, name, icon, description FROM rewards WHERE id = ? AND is_lucky_box = false',
        [itemValue]
      );
      
      if (!productExists) {
        return NextResponse.json(
          { message: '商品不存在' },
          { status: 404 }
        );
      }
      
      // 保存商品信息到item_detail
        const detailObj: ProductDetail = {
          product_id: productExists.id,
          product_name: productExists.name,
          product_icon: productExists.icon,
          product_description: productExists.description
        };
        
        processedItemDetail = JSON.stringify(detailObj);
    } else if (itemType === 'points' && itemDetail) {
        // 确保积分类型的数据结构正确
        try {
          const detailObj: PointDetail = typeof itemDetail === 'string' ? JSON.parse(itemDetail) : itemDetail as PointDetail;
          if (!detailObj.point_type || !['coin', 'diamond', 'energy'].includes(detailObj.point_type)) {
            return NextResponse.json(
              { message: '积分类型无效' },
              { status: 400 }
            );
          }
          processedItemDetail = JSON.stringify(detailObj);
        } catch (e) {
          return NextResponse.json(
            { message: 'itemDetail格式错误' },
            { status: 400 }
          );
        }
      }
    
    // 更新奖品信息
    await db.run(
      'UPDATE lucky_box_items SET item_type = ?, item_value = ?, item_detail = ?, probability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [itemType, itemValue, processedItemDetail, probability, id]
    );
    
    // 获取更新后的奖品信息
    const updatedItem: LuckyBoxItem | undefined = await db.get(
      `SELECT l.id, l.item_type, l.item_value, l.item_detail, l.probability,
             CASE 
               WHEN l.item_type = 'product' THEN r.name 
               ELSE NULL 
             END as product_name,
             CASE 
               WHEN l.item_type = 'product' THEN r.icon 
               ELSE NULL 
             END as product_icon,
             CASE 
               WHEN l.item_type = 'product' THEN r.description 
               ELSE NULL 
             END as product_description
      FROM lucky_box_items l
      LEFT JOIN rewards r ON l.item_value = r.id AND l.item_type = 'product'
      WHERE l.id = ?`,
      [id]
    );
    
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error('更新盲盒奖品失败:', error?.message || error);
    return NextResponse.json(
      { message: '服务器错误', error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// 删除盲盒奖品
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    const id = idStr ? parseInt(idStr, 10) : undefined;
    
    if (!id) {
      return NextResponse.json(
        { message: '缺少奖品ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    await db.run('DELETE FROM lucky_box_items WHERE id = ?', [id]);
    
    return NextResponse.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除盲盒奖品失败:', error?.message || error);
    return NextResponse.json(
      { message: '服务器错误', error: error?.message || String(error) },
      { status: 500 }
    );
  }
}