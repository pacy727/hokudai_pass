'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTimer } from '@/hooks/useTimer';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MiniTimer } from './MiniTimer';
import { Home, Users, BarChart3, Edit3, Settings } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const timer = useTimer();

  // ヘッダーを表示しないページ
  const hideHeaderPages = ['/login', '/timer', '/record'];
  if (hideHeaderPages.includes(pathname)) return null;

  // ナビゲーションアイテム
  const navItems = [
    { path: '/', icon: Home, label: 'ホーム', emoji: '🏠' },
    { path: '/dashboard', icon: Users, label: 'メンバー', emoji: '👥' },
    { path: '/profile', icon: BarChart3, label: 'カルテ', emoji: '📊' },
    { path: '/settings', icon: Settings, label: '設定', emoji: '⚙️' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* ロゴ・タイトル */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-primary">🎯 大谷塾</h1>
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline">
                {user.displayName}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {user.course === 'liberal' ? '📚 文系' : '🔬 理系'}
              </Badge>
            </div>
          )}
        </div>

        {/* ミニタイマー（中央） */}
        {(timer.isRunning || timer.isPaused) && (
          <div className="flex-1 flex justify-center">
            <MiniTimer />
          </div>
        )}

        {/* ナビゲーション */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.path)}
                className={`h-10 px-3 ${isActive ? 'shadow-sm' : ''}`}
              >
                <span className="sm:hidden text-base">{item.emoji}</span>
                <span className="hidden sm:flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
              </Button>
            );
          })}
          
          {/* 手動記録ボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/record')}
            className="h-10 px-3 ml-2"
          >
            <span className="sm:hidden">✏️</span>
            <span className="hidden sm:flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              記録
            </span>
          </Button>
        </nav>
      </div>
    </header>
  );
}