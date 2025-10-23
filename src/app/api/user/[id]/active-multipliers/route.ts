import { NextResponse } from 'next/server';
import { getUserAllActiveMultipliers } from '@/lib/special-effects';

// 获取用户当前活跃的倍数效果
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    // 验证用户ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { message: '无效的用户ID' },
        { status: 400 }
      );
    }

    // 使用special-effects模块获取所有活跃倍数（已包含过期时间）
    const responseData = await getUserAllActiveMultipliers(parseInt(userId));
    
    // 输出获取到的活跃倍数，用于调试
    console.log('获取到的活跃倍数（包含过期时间）:', responseData);

    // 确保兼容性：如果没有任何倍数效果，返回空对象
    if (!Object.keys(responseData).length) {
      return NextResponse.json({}, { status: 200 });
    }

    // 返回包含过期时间的活跃倍数对象
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('获取活跃倍数效果失败:', error);
    return NextResponse.json(
      { message: '获取活跃倍数效果失败' },
      { status: 500 }
    );
  }
}