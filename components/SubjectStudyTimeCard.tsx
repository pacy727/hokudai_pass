// components/SubjectStudyTimeCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import { Subject } from '@/types/study';
import { StudyRecord } from '@/types/study';
import { User } from '@/types/auth';

interface SubjectStudyTimeCardProps {
  studyRecords: StudyRecord[];
  user: User;
}

type PeriodType = 'cumulative' | 'yearly' | 'half_year' | 'quarter' | 'monthly' | 'weekly';

interface PeriodOption {
  value: PeriodType;
  label: string;
  description: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'cumulative', label: '累計', description: '全期間' },
  { value: 'yearly', label: '年間', description: '過去1年' },
  { value: 'half_year', label: '半年', description: '過去6ヶ月' },
  { value: 'quarter', label: '3ヶ月', description: '過去3ヶ月' },
  { value: 'monthly', label: '月間', description: '過去1ヶ月' },
  { value: 'weekly', label: '週間', description: '過去1週間' }
];

export function SubjectStudyTimeCard({ studyRecords, user }: SubjectStudyTimeCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('monthly');
  const [subjectTimes, setSubjectTimes] = useState<Record<Subject, number>>({} as Record<Subject, number>);

  // 利用可能科目の取得（「今すぐ勉強開始」と同じ順序）
  const getAvailableSubjects = (): Subject[] => {
    const common: Subject[] = ['英語', '数学', '国語', '情報'];
    
    if (user.course === 'liberal') {
      const subjects: Subject[] = [...common, '社会1', '社会2', '理科'];
      if (user.subjectSelection?.enableSecondScience) {
        subjects.push('理科2');
      }
      return subjects;
    } else {
      const subjects: Subject[] = [...common, '理科1', '理科2', '社会'];
      if (user.subjectSelection?.enableSecondSocial) {
        subjects.push('社会2');
      }
      return subjects;
    }
  };

  // カスタム科目名の取得
  const getSubjectDisplayName = (subjectKey: Subject): string => {
    if (!user?.customSubjects) return subjectKey;
    const customName = user.customSubjects[subjectKey as keyof typeof user.customSubjects];
    return customName || subjectKey;
  };

  // 期間に基づく学習記録のフィルタリング
  const getFilteredRecords = (period: PeriodType): StudyRecord[] => {
    if (period === 'cumulative') {
      return studyRecords;
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'yearly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'half_year':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      default:
        return studyRecords;
    }

    const startDateString = startDate.toISOString().split('T')[0];

    return studyRecords.filter(record => record.studyDate >= startDateString);
  };

  // 教科別学習時間の計算
  const calculateSubjectTimes = (period: PeriodType) => {
    const filteredRecords = getFilteredRecords(period);
    const availableSubjects = getAvailableSubjects();
    
    const times: Record<Subject, number> = {} as Record<Subject, number>;
    
    // 全教科を0で初期化
    availableSubjects.forEach(subject => {
      times[subject] = 0;
    });
    
    // 学習記録から時間を集計
    filteredRecords.forEach(record => {
      if (availableSubjects.includes(record.subject)) {
        times[record.subject] += record.studyMinutes;
      }
    });
    
    setSubjectTimes(times);
  };

  // 期間変更時に再計算
  useEffect(() => {
    calculateSubjectTimes(selectedPeriod);
  }, [selectedPeriod, studyRecords]);

  // 時間フォーマット関数
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0分';
    if (minutes < 60) return `${minutes}分`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}時間`;
    }
    return `${hours}時間${remainingMinutes}分`;
  };

  // 最大時間を取得（進捗バー用）
  const getMaxTime = (): number => {
    const times = Object.values(subjectTimes);
    return Math.max(...times, 1); // 最小1で除算エラー防止
  };

  // 教科の背景色を取得
  const getSubjectColor = (subject: Subject): string => {
    const colors = {
      数学: 'bg-blue-50 border-blue-200',
      英語: 'bg-green-50 border-green-200',
      国語: 'bg-red-50 border-red-200',
      情報: 'bg-cyan-50 border-cyan-200',
      理科: 'bg-purple-50 border-purple-200',
      理科1: 'bg-purple-50 border-purple-200',
      理科2: 'bg-purple-100 border-purple-300',
      社会: 'bg-orange-50 border-orange-200',
      社会1: 'bg-orange-50 border-orange-200',
      社会2: 'bg-orange-100 border-orange-300'
    };
    return colors[subject] || 'bg-gray-50 border-gray-200';
  };

  // 進捗バーの色を取得
  const getProgressColor = (subject: Subject): string => {
    const colors = {
      数学: 'bg-blue-500',
      英語: 'bg-green-500',
      国語: 'bg-red-500',
      情報: 'bg-cyan-500',
      理科: 'bg-purple-500',
      理科1: 'bg-purple-500',
      理科2: 'bg-purple-600',
      社会: 'bg-orange-500',
      社会1: 'bg-orange-500',
      社会2: 'bg-orange-600'
    };
    return colors[subject] || 'bg-gray-500';
  };

  const availableSubjects = getAvailableSubjects();
  const maxTime = getMaxTime();
  const totalTime = availableSubjects.reduce((sum, subject) => sum + subjectTimes[subject], 0);
  const selectedOption = PERIOD_OPTIONS.find(option => option.value === selectedPeriod);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            教科別学習時間
          </CardTitle>
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedOption?.description}の教科別学習時間（合計: {formatTime(totalTime)}）
        </p>
      </CardHeader>
      <CardContent>
        {totalTime === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedOption?.description}の学習記録がありません
            </p>
            <p className="text-sm text-gray-400 mt-1">
              学習を開始すると、ここに教科別の時間が表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableSubjects.map(subject => {
              const minutes = subjectTimes[subject];
              const percentage = maxTime > 0 ? (minutes / maxTime) * 100 : 0;
              
              return (
                <div
                  key={subject}
                  className={`p-4 rounded-lg border-2 ${getSubjectColor(subject)} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">
                        {getSubjectDisplayName(subject)}
                      </span>
                      {minutes === 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          未学習
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">
                        {formatTime(minutes)}
                      </div>
                      {totalTime > 0 && (
                        <div className="text-xs text-gray-600">
                          {Math.round((minutes / totalTime) * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {minutes > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(subject)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}