'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth';
import { Subject } from '@/types/study';
import { GraduationCap, Trophy, Clock, Star } from 'lucide-react';

// ユーザー統計データの型定義
interface UserStats {
  userId: string;
  userName: string;
  grade?: string;
  totalHours: number;
  subjectHours: Record<string, number>;
  reviewStats?: {
    totalReviewsCompleted: number;
    averageUnderstanding: number;
  };
}

interface UserRankingProps {
  userRankingData: Record<string, UserStats[]>;
  user: User;
}

export function UserRanking({ userRankingData, user }: UserRankingProps) {
  const [selectedSubject, setSelectedSubject] = useState('合計');
  const [selectedGrade, setSelectedGrade] = useState('全学年');
  const [rankingType, setRankingType] = useState<'studyTime' | 'understanding'>('studyTime');

  // 利用可能科目の取得
  const getAvailableSubjects = (): Subject[] => {
    if (!user) return ['英語', '数学', '国語', '情報'];
    
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
  const getSubjectDisplayName = (subject: string): string => {
    try {
      const customName = (user?.customSubjects as Record<string, string | undefined>)?.[subject];
      return customName || subject;
    } catch (error) {
      console.error('Error getting display name for', subject, error);
      return subject;
    }
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

  // 利用可能な学年を取得
  const getAvailableGrades = (): string[] => {
    const allData = userRankingData[selectedSubject] || [];
    const grades = new Set(allData.map(user => user.grade || 'その他').filter(Boolean));
    return ['全学年', ...Array.from(grades).sort()];
  };

  // 現在のランキングデータ取得
  const getCurrentRankingData = () => {
    let data = userRankingData[selectedSubject] || [];
    
    // 学年フィルタを適用
    if (selectedGrade !== '全学年') {
      data = data.filter(stats => (stats.grade || 'その他') === selectedGrade);
    }
    
    // ランキングタイプに応じてソート
    if (rankingType === 'understanding') {
      // 復習理解度ランキング
      data = data
        .filter(stats => stats.reviewStats && stats.reviewStats.totalReviewsCompleted > 0)
        .sort((a, b) => {
          const aUnderstanding = a.reviewStats?.averageUnderstanding || 0;
          const bUnderstanding = b.reviewStats?.averageUnderstanding || 0;
          if (aUnderstanding !== bUnderstanding) {
            return bUnderstanding - aUnderstanding;
          }
          // 同じ理解度の場合は復習回数で比較
          const aReviews = a.reviewStats?.totalReviewsCompleted || 0;
          const bReviews = b.reviewStats?.totalReviewsCompleted || 0;
          return bReviews - aReviews;
        });
    } else {
      // 学習時間ランキング（既存）
      data = data.sort((a, b) => {
        const aHours = selectedSubject === '合計' 
          ? a.totalHours 
          : (a.subjectHours[selectedSubject] || 0);
        const bHours = selectedSubject === '合計' 
          ? b.totalHours 
          : (b.subjectHours[selectedSubject] || 0);
        return bHours - aHours;
      });
    }
    
    // ランキング形式に変換
    return data.slice(0, 20).map((stats, index) => ({
      rank: index + 1,
      name: stats.userName,
      grade: stats.grade || 'その他',
      hours: selectedSubject === '合計' 
        ? Math.round(stats.totalHours * 10) / 10
        : Math.round((stats.subjectHours[selectedSubject] || 0) * 10) / 10,
      understanding: stats.reviewStats?.averageUnderstanding || 0,
      totalReviews: stats.reviewStats?.totalReviewsCompleted || 0,
      icon: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}位`,
      isCurrentUser: stats.userId === user?.uid
    }));
  };

  // ランキング表示コンポーネント
  const RankingList = ({ data }: { data: any[] }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {selectedGrade !== '全学年' ? `${getGradeDisplayName(selectedGrade)}の` : ''}
          {rankingType === 'understanding' ? '復習データがありません' : 'データがありません'}
        </div>
      ) : (
        data.map((member) => (
          <div key={member.rank} className={`flex items-center justify-between p-3 rounded-lg ${
            member.isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg">{member.icon}</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${member.isCurrentUser ? 'text-blue-700' : ''}`}>
                    {member.name}
                    {member.isCurrentUser && (
                      <Badge variant="outline" className="ml-2">あなた</Badge>
                    )}
                  </span>
                  <Badge variant="outline" className="text-xs bg-gray-100">
                    {getGradeDisplayName(member.grade)}
                  </Badge>
                </div>
                {rankingType === 'understanding' && member.totalReviews > 0 && (
                  <div className="text-xs text-gray-500">
                    復習回数: {member.totalReviews}回
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              {rankingType === 'understanding' ? (
                <div className="flex flex-col items-end">
                  <div className="font-bold text-orange-600">
                    {member.understanding.toFixed(1)}点
                  </div>
                  <div className="text-xs text-gray-500">平均理解度</div>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <div className="font-bold">{member.hours}時間</div>
                  <div className="text-xs text-gray-500">学習時間</div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const availableSubjects = getAvailableSubjects();
  const availableGrades = getAvailableGrades();

  // ドロップダウン用の選択肢
  const subjectOptions = ['合計', ...availableSubjects.map(s => getSubjectDisplayName(s))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {selectedGrade !== '全学年' ? `${getGradeDisplayName(selectedGrade)} ` : ''}
          {rankingType === 'understanding' ? '復習理解度ランキング' : '学習時間ランキング'}
          <Badge variant="default" className="bg-red-500">
            TOP20
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ランキングタイプ選択 */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={rankingType === 'studyTime' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRankingType('studyTime')}
            className="flex items-center gap-1"
          >
            <Clock className="w-4 h-4" />
            学習時間
          </Button>
          <Button
            variant={rankingType === 'understanding' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRankingType('understanding')}
            className="flex items-center gap-1"
          >
            <Star className="w-4 h-4" />
            復習理解度
          </Button>
        </div>

        {/* フィルタ選択 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 学年フィルタ */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <GraduationCap className="w-4 h-4" />
              学年フィルタ
            </label>
            <Select onValueChange={(value) => setSelectedGrade(value)} value={selectedGrade}>
              <SelectTrigger className="h-10">
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
          </div>

          {/* 科目フィルタ（学習時間ランキングの場合のみ） */}
          {rankingType === 'studyTime' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">科目フィルタ</label>
              <Select onValueChange={(value) => setSelectedSubject(value)} value={selectedSubject}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 説明テキスト */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          {rankingType === 'understanding' ? (
            <>
              📊 過去30日間の復習問題の平均理解度ランキング
              {selectedGrade !== '全学年' && ` (${getGradeDisplayName(selectedGrade)}のみ)`}
            </>
          ) : (
            <>
              ⏰ 過去30日間の学習時間ランキング
              {selectedGrade !== '全学年' && ` (${getGradeDisplayName(selectedGrade)}のみ)`}
            </>
          )}
        </div>

        {/* ランキング表示 */}
        <div className="space-y-3">
          <RankingList data={getCurrentRankingData()} />
        </div>

        {/* 統計サマリー */}
        {getCurrentRankingData().length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {getCurrentRankingData().length}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedGrade !== '全学年' ? `${getGradeDisplayName(selectedGrade)}` : '全体'}参加者
                </div>
              </div>
              {rankingType === 'understanding' ? (
                <>
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {getCurrentRankingData().length > 0 
                        ? (getCurrentRankingData().reduce((sum, user) => sum + user.understanding, 0) / getCurrentRankingData().length).toFixed(1)
                        : '0.0'
                      }
                    </div>
                    <div className="text-xs text-gray-500">平均理解度</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {getCurrentRankingData().length > 0 
                        ? Math.round(getCurrentRankingData().reduce((sum, user) => sum + user.totalReviews, 0) / getCurrentRankingData().length)
                        : 0
                      }
                    </div>
                    <div className="text-xs text-gray-500">平均復習回数</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {getCurrentRankingData().length > 0 
                        ? (getCurrentRankingData().reduce((sum, user) => sum + user.hours, 0) / getCurrentRankingData().length).toFixed(1)
                        : '0.0'
                      }h
                    </div>
                    <div className="text-xs text-gray-500">平均学習時間</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">
                      {getCurrentRankingData().length > 0 
                        ? getCurrentRankingData()[0].hours
                        : 0
                      }h
                    </div>
                    <div className="text-xs text-gray-500">トップ記録</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}