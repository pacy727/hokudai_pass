// components/SubjectStudyTimeCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // 教科のアイコンと色を取得
  const getSubjectInfo = (subject: Subject) => {
    const subjectMap = {
      数学: { icon: '🔢', color: 'bg-blue-500', textColor: 'text-blue-700' },
      英語: { icon: '🗣️', color: 'bg-green-500', textColor: 'text-green-700' },
      国語: { icon: '📝', color: 'bg-red-500', textColor: 'text-red-700' },
      情報: { icon: '💻', color: 'bg-cyan-500', textColor: 'text-cyan-700' },
      理科: { icon: '🧪', color: 'bg-purple-500', textColor: 'text-purple-700' },
      理科1: { icon: '⚛️', color: 'bg-purple-500', textColor: 'text-purple-700' },
      理科2: { icon: '🔬', color: 'bg-purple-600', textColor: 'text-purple-700' },
      社会: { icon: '🌍', color: 'bg-orange-500', textColor: 'text-orange-700' },
      社会1: { icon: '📚', color: 'bg-orange-500', textColor: 'text-orange-700' },
      社会2: { icon: '🏛️', color: 'bg-orange-600', textColor: 'text-orange-700' }
    };
    return subjectMap[subject] || { icon: '📖', color: 'bg-gray-500', textColor: 'text-gray-700' };
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
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              合計: <span className="font-bold text-blue-600">{formatTime(totalTime)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalTime === 0 ? (
          <div className="text-center py-6">
            <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {selectedOption?.description}の学習記録がありません
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 積み上げ横棒グラフ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">学習時間比率</h4>
              <div className="w-full bg-gray-200 rounded-full h-10 flex overflow-hidden">
                {availableSubjects
                  .filter(subject => subjectTimes[subject] > 0) // 学習済みの教科のみ
                  .map((subject, index) => {
                    const minutes = subjectTimes[subject];
                    const percentage = totalTime > 0 ? (minutes / totalTime) * 100 : 0;
                    const subjectInfo = getSubjectInfo(subject);
                    
                    return (
                      <div
                        key={subject}
                        className={`h-full ${subjectInfo.color} transition-all duration-500 flex items-center justify-center relative`}
                        style={{ width: `${percentage}%` }}
                      >
                        {/* 教科名と％を常時表示（改行） */}
                        {percentage > 8 && (
                          <div className="text-white text-xs font-bold text-center px-1 leading-tight">
                            <div className="truncate">{getSubjectDisplayName(subject)}</div>
                            <div>{Math.round(percentage)}%</div>
                          </div>
                        )}
                        {percentage > 4 && percentage <= 8 && (
                          <div className="text-white text-xs font-bold text-center px-1 leading-tight">
                            <div className="truncate text-xs">{getSubjectDisplayName(subject)}</div>
                            <div className="text-xs">{Math.round(percentage)}%</div>
                          </div>
                        )}
                        {percentage <= 4 && (
                          <div className="text-white text-xs font-bold text-center px-0.5 leading-tight">
                            <div className="truncate text-xs">{getSubjectDisplayName(subject)}</div>
                            <div className="text-xs">{Math.round(percentage)}%</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {/* 凡例表示（小さな領域の教科用） */}
              <div className="flex flex-wrap gap-2 text-xs">
                {availableSubjects
                  .filter(subject => subjectTimes[subject] > 0)
                  .map(subject => {
                    const minutes = subjectTimes[subject];
                    const percentage = totalTime > 0 ? (minutes / totalTime) * 100 : 0;
                    const subjectInfo = getSubjectInfo(subject);
                    
                    return (
                      <div key={subject} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${subjectInfo.color}`}></div>
                        <span className="text-gray-600">
                          {getSubjectDisplayName(subject)} {Math.round(percentage)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 教科別詳細一覧 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {availableSubjects.map(subject => {
                const minutes = subjectTimes[subject];
                const subjectInfo = getSubjectInfo(subject);
                
                return (
                  <div
                    key={subject}
                    className="relative bg-white border rounded-lg p-3 hover:shadow-sm transition-all"
                  >
                    {/* 教科アイコンと名前 */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{subjectInfo.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-medium ${subjectInfo.textColor} truncate`}>
                          {getSubjectDisplayName(subject)}
                        </div>
                        <div className="text-sm text-gray-800 font-bold">
                          {formatTime(minutes)}
                        </div>
                      </div>
                    </div>

                    {/* 未学習の場合 */}
                    {minutes === 0 && (
                      <div className="absolute inset-0 bg-gray-50 bg-opacity-80 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-400 font-medium">未学習</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 統計サマリー（コンパクト版） */}
        {totalTime > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm font-bold text-blue-600">
                  {Math.round(totalTime / 60 * 10) / 10}h
                </div>
                <div className="text-xs text-muted-foreground">総学習時間</div>
              </div>
              <div>
                <div className="text-sm font-bold text-green-600">
                  {availableSubjects.filter(s => subjectTimes[s] > 0).length}科目
                </div>
                <div className="text-xs text-muted-foreground">学習済み</div>
              </div>
              <div>
                <div className="text-sm font-bold text-orange-600">
                  {Math.round(totalTime / Math.max(availableSubjects.filter(s => subjectTimes[s] > 0).length, 1))}分
                </div>
                <div className="text-xs text-muted-foreground">科目平均</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}