'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subject } from '@/types/study';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubject: Subject | null;
  newSubject: Subject;
  elapsedTime: number;
  onConfirm: () => void;
  onCancel: () => void;
  formatTime: (seconds: number) => string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  currentSubject,
  newSubject,
  elapsedTime,
  onConfirm,
  onCancel,
  formatTime
}: ConfirmDialogProps) {
  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // 背景スクロールを防ぐ
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* ダイアログコンテンツ */}
      <Card className="relative w-full max-w-md mx-4 shadow-xl animate-in fade-in-0 slide-in-from-top-full duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            ⚠️ 学習中の科目変更
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 現在の状況 */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-yellow-100">
                {currentSubject}
              </Badge>
              <span className="text-sm font-medium text-yellow-800">
                {formatTime(elapsedTime)} 学習中
              </span>
            </div>
            <p className="text-sm text-yellow-700">
              <span className="font-medium">{newSubject}</span>に変更すると、現在の学習記録が自動保存されます。
            </p>
          </div>
          
          {/* 実行される処理 */}
          <div className="space-y-2 text-sm">
            <h4 className="font-medium text-gray-800">📝 実行される処理：</h4>
            <ul className="space-y-1 text-muted-foreground ml-4 text-xs">
              <li>• {currentSubject}の学習記録を保存</li>
              <li>• {newSubject}の新しいタイマーを開始</li>
              <li>• タイマーページに移動</li>
            </ul>
          </div>

          <p className="text-sm font-medium text-center text-gray-700">
            続行してもよろしいですか？
          </p>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              ✕ キャンセル
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              ✓ 変更する
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}