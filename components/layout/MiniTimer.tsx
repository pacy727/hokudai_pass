'use client';

import { useRouter } from 'next/navigation';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Maximize2 } from 'lucide-react';

export function MiniTimer() {
  const router = useRouter();
  const timer = useTimer();

  if (!timer.isRunning && !timer.isPaused) return null;

  const getSubjectColor = (subject: string) => {
    const colors = {
      数学: 'bg-blue-500',
      英語: 'bg-green-500',
      国語: 'bg-red-500',
      理科: 'bg-purple-500',
      社会: 'bg-orange-500'
    };
    return colors[subject as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusIcon = () => {
    if (timer.isRunning) return '🟢';
    if (timer.isPaused) return '⏸️';
    return '⚪';
  };

  const handleQuickAction = (action: 'pause' | 'resume' | 'stop') => {
    switch (action) {
      case 'pause':
        timer.pauseTimer();
        break;
      case 'resume':
        timer.resumeTimer();
        break;
      case 'stop':
        // タイマーページに遷移して停止処理
        router.push(`/timer?subject=${timer.subject}`);
        break;
    }
  };

  const openTimerPage = () => {
    router.push(`/timer?subject=${timer.subject}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm">
      {/* 状態アイコン */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${timer.isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
        <Badge 
          variant="outline" 
          className={`text-white text-xs px-2 py-0 ${getSubjectColor(timer.subject || '')}`}
        >
          {timer.subject}
        </Badge>
      </div>

      {/* タイマー表示 */}
      <div className="font-mono text-sm font-bold text-gray-800 min-w-[60px]">
        {timer.formatTime(timer.elapsedTime)}
      </div>

      {/* 状態表示 */}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {getStatusIcon()} {timer.isRunning ? '勉強中' : '一時停止'}
      </span>

      {/* クイックアクション */}
      <div className="flex items-center gap-1">
        {timer.isRunning && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickAction('pause')}
            className="h-7 w-7 p-0"
            title="一時停止"
          >
            <Pause className="w-3 h-3" />
          </Button>
        )}
        
        {timer.isPaused && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickAction('resume')}
            className="h-7 w-7 p-0"
            title="再開"
          >
            <Play className="w-3 h-3" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickAction('stop')}
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
          title="停止"
        >
          <Square className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={openTimerPage}
          className="h-7 w-7 p-0"
          title="タイマーページを開く"
        >
          <Maximize2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}