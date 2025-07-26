'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTimer } from '@/hooks/useTimer';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MiniTimer } from './MiniTimer';
import { Home, Users, BarChart3, Edit3, Settings, MessageSquare, Shield } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const timer = useTimer();

  // ヘッダーを表示しないページ
  const hideHeaderPages = ['/login', '/timer', '/record'];
  if (hideHeaderPages.includes(pathname)) return null;

  // 基本ナビゲーションアイテム
  const navItems = [
    { path: '/', icon: Home, label: 'ホーム', emoji: '🏠' },
    { path: '/dashboard', icon: Users, label: 'メンバー', emoji: '👥' },
    { path: '/profile', icon: BarChart3, label: 'カルテ', emoji: '📊' },
    { path: '/settings', icon: Settings, label: '設定', emoji: '⚙️' }
  ];

  // 管理者用ナビゲーションアイテム
  const adminNavItems = user?.role === 'admin' ? [
    { 
      path: '/admin/review-requests', 
      icon: MessageSquare, 
      label: '復習問題管理', 
      emoji: '📝',
      description: '復習問題リクエストの管理'
    }
  ] : [];

  // 管理者かどうかの判定
  const isAdmin = user?.role === 'admin';

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
              {/* 管理者バッジ */}
              {isAdmin && (
                <Badge variant="default" className="text-xs bg-red-600 hover:bg-red-700">
                  <Shield className="w-3 h-3 mr-1" />
                  管理者
                </Badge>
              )}
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
          {/* 基本ナビゲーション */}
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.path)}
                className={`h-10 px-3 ${isActive ? 'shadow-sm' : ''}`}
                title={item.label}
              >
                <span className="sm:hidden text-base">{item.emoji}</span>
                <span className="hidden sm:flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
              </Button>
            );
          })}

          {/* 管理者用ナビゲーション */}
          {adminNavItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.path)}
                className={`h-10 px-3 ${isActive ? 'shadow-sm' : ''} ${
                  isActive 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
                title={item.description}
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
            title="学習記録を手動で入力"
          >
            <span className="sm:hidden">✏️</span>
            <span className="hidden sm:flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              記録
            </span>
          </Button>
        </nav>
      </div>

      {/* 管理者モード表示バー（管理者ページにいる場合） */}
      {isAdmin && pathname.startsWith('/admin') && (
        <div className="bg-red-600 text-white text-center py-1 text-xs">
          <div className="container mx-auto px-4 flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            <span>管理者モードでアクセス中</span>
            <Badge variant="outline" className="text-white border-white text-xs">
              {pathname.includes('review-requests') ? '復習問題管理' : '管理機能'}
            </Badge>
          </div>
        </div>
      )}
    </header>
  );
}