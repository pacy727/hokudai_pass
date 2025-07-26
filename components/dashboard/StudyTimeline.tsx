'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BookOpen } from 'lucide-react';
import { User } from '@/types/auth';

// タイムラインアイテムの型定義
interface TimelineItem {
  id: string;
  type: 'study_record';
  userName: string;
  timestamp: Date;
  subject: string;
  content: string;
  details?: string;
  studyTime: number; // 分
  icon: string;
  color: string;
}

interface StudyTimelineProps {
  timelineData: TimelineItem[];
  user: User;
}

export function StudyTimeline({ timelineData, user }: StudyTimelineProps) {
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  // カスタム科目名の取得
  const getSubjectDisplayName = (subject: string): string => {
    try {
      const customName = (user?.customSubjects as Record<string, string | undefined>)?.[subject];
      return customName || subject;
    } catch (error) {
      console.error('Error getting display name for', subject, error);
      return subject;
    }
  };

  // タイムライン表示制限
  const getDisplayTimelineItems = () => {
    return showAllTimeline ? timelineData : timelineData.slice(0, 30);
  };

  // タイムラインアイテムコンポーネント
  const TimelineItemComponent = ({ item }: { item: TimelineItem }) => (
    <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
          <span className="text-lg">{item.icon}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm">{item.userName}</span>
          <Badge variant="outline" className="text-xs">
            {getSubjectDisplayName(item.subject)}
          </Badge>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(item.timestamp, { locale: ja })}前
          </span>
        </div>
        <div className="text-sm text-gray-800 mb-1">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-3 w-3 text-gray-500" />
            <span>{item.content}</span>
            <span className="text-xs text-gray-500">
              ({Math.floor(item.studyTime / 60) > 0 
                ? `${Math.floor(item.studyTime / 60)}時間${item.studyTime % 60}分` 
                : `${item.studyTime}分`})
            </span>
          </div>
        </div>
        {item.details && (
          <div className="text-xs text-gray-500 mt-1">
            {item.details}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📚 学習記録タイムライン（全ユーザー）
          <Badge variant="default" className="bg-yellow-500">
            {timelineData.length}件
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {getDisplayTimelineItems().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              学習記録がありません
            </div>
          ) : (
            getDisplayTimelineItems().map((item) => (
              <TimelineItemComponent key={item.id} item={item} />
            ))
          )}
          {timelineData.length > 30 && (
            <Button
              variant="outline"
              onClick={() => setShowAllTimeline(!showAllTimeline)}
              className="w-full"
            >
              {showAllTimeline ? 'タイムラインを閉じる' : 'さらに表示'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}