'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CalendarIcon, BackpackIcon, StoreIcon, SettingsIcon } from '@/components/icons';

interface Props {
  activePage: string;
}

export default function BottomNavigation({ activePage }: Props) {
  const pathname = usePathname() || '';
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-2">
      <div className="max-w-2xl mx-auto flex justify-around items-center">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center px-4 py-2 ${activePage === 'home' ? 'text-purple-600' : 'text-gray-500'}`}
        >
          <HomeIcon size={24} />
          <span className="text-xs mt-1">首页</span>
        </Link>
        <Link
          href="/tasks"
          className={`flex flex-col items-center justify-center px-4 py-2 ${activePage === 'calendar' ? 'text-purple-600' : 'text-gray-500'}`}
        >
          <CalendarIcon size={24} />
          <span className="text-xs mt-1">任务</span>
        </Link>
        <Link
          href="/backpack"
          className={`flex flex-col items-center justify-center px-4 py-2 ${activePage === 'backpack' ? 'text-purple-600' : 'text-gray-500'}`}
        >
          <BackpackIcon size={24} />
          <span className="text-xs mt-1">背包</span>
        </Link>
        <Link
          href="/store"
          className={`flex flex-col items-center justify-center px-4 py-2 ${activePage === 'store' ? 'text-purple-600' : 'text-gray-500'}`}
        >
          <StoreIcon size={24} />
          <span className="text-xs mt-1">商店</span>
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center px-4 py-2 ${activePage === 'settings' ? 'text-purple-600' : 'text-gray-500'}`}
        >
          <SettingsIcon size={24} />
          <span className="text-xs mt-1">我的</span>
        </Link>
      </div>
    </div>
  );
}