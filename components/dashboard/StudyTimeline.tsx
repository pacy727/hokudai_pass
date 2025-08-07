'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BookOpen, GraduationCap } from 'lucide-react';
import { User } from '@/types/auth';

// タイムラインアイテムの型定義
interface TimelineItem {
  id: string;
  type: 'study_record';
  userName: string;
  userId: string; // ユーザーIDを追加
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
  userGradesMap?: Map<string, string>; // 学年情報マップを追加
}

export function StudyTimeline({ 
  timelineData, 
  user,
  userGradesMap = new Map()
}: StudyTimelineProps) {
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('全学年');

  // 利用可能な学年を取得
  const getAvailableGrades = (): string[] => {
    const grades = new Set<string>();
    userGradesMap.forEach(grade => {
      if (grade) grades.add(grade);
    });
    return ['全学年', ...Array.from(grades).sort()];
  };

  // 学年名の表示形式を取得
  const getGradeDisplayName = (grade: string) => {
    const gradeMap = {
      '1学年': '1学年',
      '2学年': '2学年', 
      '3学年': '3学年',
      'その他': 'その他'
    };
    return gradeMap[grade as keyof typeof gradeMap] || grade;
  };

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

  // 学年でフィルタリングされたタイムラインを取得
  const getFilteredTimeline = () => {
    if (gradeFilter === '全学年') {
      return timelineData;
    }
    
    return timelineData.filter(item => {
      const userGrade = userGradesMap.get(item.userId);
      return userGrade === gradeFilter;
    });
  };

  // タイムライン表示制限
  const getDisplayTimelineItems = () => {
    const filteredTimeline = getFilteredTimeline();
    return showAllTimeline ? filteredTimeline.slice(0, 50) : filteredTimeline.slice(0, 30);
  };

  // タイムラインアイテムコンポーネント
  const TimelineItemComponent = ({ item }: { item: TimelineItem }) => {
    const userGrade = userGradesMap.get(item.userId);
    
    return (
      <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
            <span className="text-lg">{item.icon}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">{item.userName}</span>
            {userGrade && (
              <Badge variant="outline" className="text-xs bg-gray-100">
                {getGradeDisplayName(userGrade)}
              </Badge>
            )}
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
  };

  const availableGrades = getAvailableGrades();
  const filteredTimeline = getFilteredTimeline();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📚 学習記録タイムライン（全ユーザー）
            <Badge variant="default" className="bg-yellow-500">
              {filteredTimeline.length}件
            </Badge>
            {gradeFilter !== '全学年' && (
              <Badge variant="outline" className="bg-blue-50">
                {getGradeDisplayName(gradeFilter)}
              </Badge>
            )}
          </CardTitle>
        </div>
        
        {/* 学年フィルタ */}
        <div className="flex items-center gap-3">
          <GraduationCap className="w-4 h-4" />
          <span className="text-sm font-medium">学年フィルタ:</span>
          <Select onValueChange={(value) => setGradeFilter(value)} value={gradeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="学年を選択" />
            </SelectTrigger>
            <SelectContent>
              {availableGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade === '全学年' ? '🌍 全学年' : `🎓 ${getGradeDisplayName(grade)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {filteredTimeline.length}件
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {getDisplayTimelineItems().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {gradeFilter !== '全学年' 
                ? `${getGradeDisplayName(gradeFilter)}の学習記録がありません` 
                : '学習記録がありません'
              }
            </div>
          ) : (
            getDisplayTimelineItems().map((item) => (
              <TimelineItemComponent key={item.id} item={item} />
            ))
          )}
          {filteredTimeline.length > 30 && (
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