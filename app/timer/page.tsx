'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTimer } from '@/hooks/useTimer';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subject } from '@/types/study';
import { Play, Pause, Square, Home, RotateCcw } from 'lucide-react';

export default function TimerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const timer = useTimer();
  const [subject] = useState<Subject | null>(searchParams.get('subject') as Subject);

  useEffect(() => {
    // URL から subject が取得できない場合はホームに戻る
    if (!subject) {
      router.push('/');
      return;
    }

    // タイマーが停止状態なら自動開始
    if (!timer.isRunning && !timer.isPaused && timer.elapsedTime === 0) {
      timer.startTimer(subject);
    }
  }, [subject, timer, router]);

  const handlePause = () => {
    if (timer.isRunning) {
      timer.pauseTimer();
    } else if (timer.isPaused) {
      timer.resumeTimer();
    }
  };

  const handleStop = async () => {
    try {
      const recordData = await timer.stopTimer();
      if (recordData) {
        // 記録ページに遷移
        const params = new URLSearchParams({
          data: JSON.stringify(recordData)
        });
        router.push(`/record?${params.toString()}`);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handleMinimize = () => {
    // PWA対応: バックグラウンドでタイマー継続
    router.push('/');
  };

  const handleReset = () => {
    if (confirm('タイマーをリセットしてもよろしいですか？')) {
      timer.resetTimer();
      router.push('/');
    }
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      数学: 'bg-blue-50 border-blue-200',
      英語: 'bg-green-50 border-green-200',
      国語: 'bg-red-50 border-red-200',
      理科: 'bg-purple-50 border-purple-200',
      社会: 'bg-orange-50 border-orange-200'
    };
    return colors[subject] || 'bg-gray-50 border-gray-200';
  };

  if (!subject) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>科目を選択してください</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <Card className={`${getSubjectColor(subject)}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            ⏱️ {subject} 勉強中...
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            集中して頑張りましょう！
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* タイマー表示 */}
          <div className="text-center">
            <div className="text-6xl font-mono font-bold mb-4 text-gray-800">
              {timer.formatTime(timer.elapsedTime)}
            </div>
            <Badge 
              variant={timer.isRunning ? "default" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {timer.isRunning ? "勉強中" : timer.isPaused ? "一時停止中" : "待機中"}
            </Badge>
          </div>

          {/* リアルタイム表示通知 */}
          <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
            <p className="text-sm text-green-700 font-medium">
              📍 現在学習中として表示されています
            </p>
            <p className="text-xs text-green-600 mt-1">
              🟢 {user?.displayName} ({subject} - {timer.formatTime(timer.elapsedTime)})
            </p>
          </div>

          {/* メインコントロールボタン */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={timer.isRunning ? "secondary" : "default"}
              onClick={handlePause}
              className="h-14 text-base"
              size="lg"
            >
              {timer.isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  一時停止
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  再開
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              className="h-14 text-base"
              size="lg"
            >
              <Square className="w-5 h-5 mr-2" />
              勉強終了
            </Button>
          </div>

          {/* サブコントロールボタン */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              onClick={handleMinimize}
              className="h-12"
            >
              <Home className="w-4 h-4 mr-1" />
              ホーム
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              className="h-12"
            >
              👥 メンバー
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="h-12"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              リセット
            </Button>
          </div>

          {/* 今日の目標 */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 text-center">
              📝 今日の目標: 8時間勉強
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              現在の進捗: {timer.formatTime(timer.elapsedTime)} / 8:00:00
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 背景でタイマーが動いている時の注意書き */}
      {timer.isRunning && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            💡 このタブを閉じてもタイマーは継続されます
          </p>
        </div>
      )}
    </div>
  );
}
