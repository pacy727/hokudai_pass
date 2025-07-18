'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTimer } from '@/hooks/useTimer';
import { useAuth } from '@/hooks/useAuth';
import { Subject } from '@/types/study';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface SubjectButtonProps {
  subject: Subject;
}

export function SubjectButton({ subject }: SubjectButtonProps) {
  const router = useRouter();
  const timer = useTimer();
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = async () => {
    // タイマーが動作中で、異なる科目の場合は確認ダイアログを表示
    if ((timer.isRunning || timer.isPaused) && timer.subject !== subject) {
      setShowConfirm(true);
      return;
    }

    // 同じ科目、またはタイマー停止中の場合は直接開始
    await startNewTimer();
  };

  const startNewTimer = async () => {
    try {
      await timer.startTimer(subject);
      router.push(`/timer?subject=${subject}`);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleConfirm = async () => {
    try {
      // 現在のタイマーを停止して記録保存
      const recordData = await timer.stopTimer();
      
      // 少し待ってから新しいタイマーを開始
      setTimeout(async () => {
        await startNewTimer();
      }, 100);
      
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to switch timer:', error);
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  // 科目表示名の取得（カスタマイズ対応）
  const getDisplayName = () => {
    if (user?.customSubjects) {
      const customName = user.customSubjects[subject as keyof typeof user.customSubjects];
      if (customName) return customName;
    }
    return subject;
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      数学: 'bg-blue-500 hover:bg-blue-600',
      英語: 'bg-green-500 hover:bg-green-600',
      国語: 'bg-red-500 hover:bg-red-600',
      情報: 'bg-cyan-500 hover:bg-cyan-600',
      理科: 'bg-purple-400 hover:bg-purple-500',    // 文系用理科
      理科1: 'bg-purple-500 hover:bg-purple-600',   // 理系用理科1
      理科2: 'bg-purple-600 hover:bg-purple-700',   // 理系用理科2・文系追加理科
      社会: 'bg-orange-400 hover:bg-orange-500',    // 理系用社会
      社会1: 'bg-orange-500 hover:bg-orange-600',   // 文系用社会1
      社会2: 'bg-orange-600 hover:bg-orange-700'    // 文系用社会2・理系追加社会
    };
    return colors[subject];
  };

  // 現在実行中の科目かどうか
  const isCurrentSubject = (timer.isRunning || timer.isPaused) && timer.subject === subject;

  return (
    <>
      <Button
        onClick={handleClick}
        className={`h-12 text-white font-bold relative ${getSubjectColor(subject)} ${
          isCurrentSubject ? 'ring-2 ring-white ring-offset-2' : ''
        }`}
      >
        <span className="text-xs leading-tight">
          {getDisplayName()}
        </span>
        {isCurrentSubject && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        currentSubject={timer.subject}
        newSubject={subject}
        elapsedTime={timer.elapsedTime}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        formatTime={timer.formatTime}
      />
    </>
  );
}