"use client"

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { ReviewItem, ReviewStage, ReviewProgress } from '@/types/review';
import { ReviewService } from '@/lib/db/reviewService';

interface ReviewWorkflowProps {
  reviewItem: ReviewItem;
  onStageSelect: (reviewItem: ReviewItem, stage: ReviewStage) => void;
  getSubjectDisplayName: (subject: string) => string;
}

export function ReviewWorkflow({ 
  reviewItem, 
  onStageSelect, 
  getSubjectDisplayName 
}: ReviewWorkflowProps) {
  
  const schedule = ReviewService.getReviewSchedule();
  
  const getStageStatus = (progress: ReviewProgress) => {
    if (progress.isCompleted) return 'completed';
    if (progress.isOverdue) return 'overdue';
    if (progress.stage === reviewItem.currentStage) return 'current';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'current': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string, understanding?: number) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
        );
      case 'current':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (date: Date) => {
    // 月/日(曜日)の形式で表示（例：7/18(金)）
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()}(${dayOfWeek})`;
  };

  const canSelectStage = (progress: ReviewProgress) => {
    // 完了済みでも再度アクセス可能、または現在のステージ
    return progress.isCompleted || progress.stage === reviewItem.currentStage;
  };

  // unitとcontentが同じ場合はunitを優先表示
  const displayText = reviewItem.unit && reviewItem.unit.trim() 
    ? reviewItem.unit 
    : reviewItem.content;

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        {/* 1行目：教科・テキスト・ワークフロー */}
        <div className="flex items-center space-x-4">
          {/* 教科バッジ */}
          <Badge variant="outline" className="flex-shrink-0">
            {getSubjectDisplayName(reviewItem.subject)}
          </Badge>

          {/* テキスト */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {displayText}
            </span>
          </div>

          {/* ワークフロー（横並び） */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {reviewItem.progress.map((progress, index) => {
              const status = getStageStatus(progress);
              const stageName = schedule.stages.find(s => s.stage === progress.stage)?.name || `${progress.stage}`;
              const isClickable = canSelectStage(progress);
              
              return (
                <div key={progress.stage} className="flex items-center">
                  {/* ステップ */}
                  <div 
                    className={`flex items-center space-x-1 px-2 py-1 border rounded text-xs transition-all ${
                      getStatusColor(status)
                    } ${isClickable ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'}`}
                    onClick={isClickable ? () => onStageSelect(reviewItem, progress.stage) : undefined}
                    title={`${stageName} (${formatDate(progress.scheduledDate)})`}
                  >
                    {getStatusIcon(status, progress.understanding)}
                    <span className="text-xs">{formatDate(progress.scheduledDate)}</span>
                    {progress.understanding && (
                      <span className="text-xs font-bold">
                        {progress.understanding}
                      </span>
                    )}
                  </div>

                  {/* 矢印（最後以外） */}
                  {index < reviewItem.progress.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-gray-400 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 完了メッセージ（完了時のみ） */}
        {reviewItem.isCompleted && (
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            復習完了
          </div>
        )}
      </CardContent>
    </Card>
  );
}