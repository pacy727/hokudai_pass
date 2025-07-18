"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  AlertTriangle, 
  Calendar,
  Target,
  CheckCircle
} from 'lucide-react';
import { TodayTask, ReviewStage } from '@/types/review';
import { ReviewService } from '@/lib/db/reviewService';

interface TodayTasksProps {
  tasks: TodayTask[];
  onTaskSelect: (task: TodayTask) => void;
  getSubjectDisplayName: (subject: string) => string;
}

export function TodayTasks({ 
  tasks, 
  onTaskSelect, 
  getSubjectDisplayName 
}: TodayTasksProps) {
  
  const schedule = ReviewService.getReviewSchedule();
  
  const getTaskPriority = (task: TodayTask) => {
    if (task.isOverdue) {
      if (task.daysPastDue && task.daysPastDue > 7) return 'critical';
      if (task.daysPastDue && task.daysPastDue > 3) return 'high';
      if (task.daysPastDue && task.daysPastDue > 0) return 'medium';
    }
    return 'normal';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 'high': return <AlertTriangle className="h-3 w-3 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
      default: return <Target className="h-3 w-3 text-blue-600" />;
    }
  };

  const formatTaskDate = (task: TodayTask) => {
    const taskDate = task.scheduledDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const scheduledDateOnly = new Date(taskDate);
    scheduledDateOnly.setHours(0, 0, 0, 0);
    
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[taskDate.getDay()];
    const dateString = `${taskDate.getMonth() + 1}/${taskDate.getDate()}(${dayOfWeek})`;
    
    if (task.isOverdue && task.daysPastDue && task.daysPastDue > 0) {
      return `${dateString} (${task.daysPastDue}日遅れ)`;
    }
    
    if (scheduledDateOnly.getTime() === today.getTime()) {
      return '今日';
    }
    
    return dateString;
  };

  const getStageName = (stage: ReviewStage) => {
    return schedule.stages.find(s => s.stage === stage)?.name || `第${stage}回`;
  };

  // タスクを優先度順にソート
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3 };
    const aPriority = getTaskPriority(a);
    const bPriority = getTaskPriority(b);
    
    if (aPriority !== bPriority) {
      return priorityOrder[aPriority as keyof typeof priorityOrder] - 
             priorityOrder[bPriority as keyof typeof priorityOrder];
    }
    
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });

  // タスクの表示テキスト（重複回避）
  const getDisplayText = (task: TodayTask) => {
    const item = task.reviewItem;
    return item.unit && item.unit.trim() ? item.unit : item.content;
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>本日のタスク</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-green-600 font-medium">今日の復習タスクはありません</p>
            <p className="text-sm text-gray-500 mt-1">
              素晴らしい！今日はゆっくり休んでください
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>本日のタスク</span>
            <Badge variant="outline">{tasks.length}件</Badge>
          </div>
          {tasks.filter(t => t.isOverdue && t.daysPastDue && t.daysPastDue > 0).length > 0 && (
            <div className="text-sm text-red-600">
              {tasks.filter(t => t.isOverdue && t.daysPastDue && t.daysPastDue > 0).length}件遅れ
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedTasks.map((task) => {
            const priority = getTaskPriority(task);
            const stageName = getStageName(task.stage);
            const displayText = getDisplayText(task);
            
            return (
              <div
                key={`${task.reviewItem.id}-${task.stage}`}
                className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer hover:shadow-sm ${
                  getPriorityColor(priority)
                }`}
                onClick={() => onTaskSelect(task)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* 優先度アイコン */}
                  {getPriorityIcon(priority)}
                  
                  {/* 教科バッジ */}
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    {getSubjectDisplayName(task.reviewItem.subject)}
                  </Badge>

                  {/* テキスト */}
                  <span className="text-sm font-medium truncate flex-1">
                    {displayText}
                  </span>

                  {/* ステージと期日 */}
                  <div className="flex items-center space-x-2 flex-shrink-0 text-xs text-gray-600">
                    <Badge variant="outline" className="text-xs">
                      {stageName}
                    </Badge>
                    <span>
                      {formatTaskDate(task)}
                    </span>
                  </div>
                </div>

                {/* 復習ボタン */}
                <Button 
                  size="sm" 
                  variant={priority === 'normal' ? 'outline' : 'default'}
                  className={`ml-3 text-xs px-3 py-1 ${
                    priority !== 'normal' ? 'bg-white text-gray-800 hover:bg-gray-50' : ''
                  }`}
                >
                  復習
                </Button>
              </div>
            );
          })}
        </div>

        {/* 統計情報（コンパクト版） */}
        {tasks.length > 1 && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                今日: {tasks.filter(t => !t.isOverdue || !t.daysPastDue || t.daysPastDue === 0).length}件
              </span>
              <span>
                遅れ: {tasks.filter(t => t.isOverdue && t.daysPastDue && t.daysPastDue > 0).length}件
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}