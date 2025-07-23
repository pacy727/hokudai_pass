'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTimer } from '@/hooks/useTimer';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subject } from '@/types/study';
import { Play, Pause, Square, Home, RotateCcw, Eye, EyeOff } from 'lucide-react';

export default function TimerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const timer = useTimer();
  const [subject] = useState<Subject | null>(searchParams.get('subject') as Subject);
  const [isTimeVisible, setIsTimeVisible] = useState(true);

  useEffect(() => {
    // URL から subject が取得できない場合はホームに戻る
    if (!subject) {
      router.push('/');
      return;
    }

    // タイマーが停止状態で、経過時間も0なら自動開始
    if (!timer.isRunning && !timer.isPaused && timer.elapsedTime === 0) {
      timer.startTimer(subject);
    }
  }, [subject, timer, router]);

  const handlePauseResume = () => {
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

  const handleReset = async () => {
    if (confirm('タイマーをリセットしてもよろしいですか？')) {
      // タイマーを完全に停止・リセット
      await timer.stopTimer();
      timer.resetTimer();
      router.push('/');
    }
  };

  // カスタム科目名の取得
  const getSubjectDisplayName = (subjectKey: Subject): string => {
    if (!user?.customSubjects) return subjectKey;
    const customName = user.customSubjects[subjectKey as keyof typeof user.customSubjects];
    return customName || subjectKey;
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      数学: 'bg-blue-50 border-blue-200',
      英語: 'bg-green-50 border-green-200',
      国語: 'bg-red-50 border-red-200',
      理科: 'bg-purple-50 border-purple-200',
      社会: 'bg-orange-50 border-orange-200',
      情報: 'bg-gray-50 border-gray-200',
      理科1: 'bg-gray-50 border-gray-200',
      理科2: 'bg-gray-50 border-gray-200',
      社会1: 'bg-gray-50 border-gray-200',
      社会2: 'bg-gray-50 border-gray-200'
    };
    return colors[subject] || 'bg-gray-50 border-gray-200';
  };

  const getTimerStatus = () => {
    if (timer.isRunning) return { text: "勉強中", color: "default", icon: "🟢" };
    if (timer.isPaused) return { text: "一時停止中", color: "secondary", icon: "⏸️" };
    return { text: "待機中", color: "outline", icon: "⚪" };
  };

  if (!subject) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>科目を選択してください</p>
      </div>
    );
  }

  const status = getTimerStatus();

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <Card className={`${getSubjectColor(subject)}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            ⏱️ {getSubjectDisplayName(subject)} 学習タイマー
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            集中して頑張りましょう！
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* タイマー表示 */}
          <div className="text-center">
            <div className="text-6xl font-mono font-bold mb-4 text-gray-800">
              {isTimeVisible ? timer.formatTime(timer.elapsedTime) : '••:••:••'}
            </div>
            <Badge 
              variant={status.color as any}
              className="text-sm px-3 py-1"
            >
              {status.icon} {status.text}
            </Badge>
          </div>

          {/* 時間表示切り替えボタン */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTimeVisible(!isTimeVisible)}
              className="text-xs"
            >
              {isTimeVisible ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  時刻非表示
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  時刻表示
                </>
              )}
            </Button>
          </div>

          {/* メインコントロールボタン */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={timer.isRunning ? "secondary" : "default"}
              onClick={handlePauseResume}
              className="h-14 text-base"
              size="lg"
              disabled={!timer.isRunning && !timer.isPaused}
            >
              {timer.isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  一時停止
                </>
              ) : timer.isPaused ? (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  再開
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  開始
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              className="h-14 text-base"
              size="lg"
              disabled={timer.elapsedTime === 0}
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
              disabled={timer.elapsedTime === 0}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 背景でタイマーが動いている時の注意書き */}
      {(timer.isRunning || timer.isPaused) && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            💡 このタブを閉じてもタイマーは継続されます
          </p>
        </div>
      )}
    </div>
  );
}