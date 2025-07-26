'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types/auth';
import { Subject } from '@/types/study';

// ユーザー統計データの型定義
interface UserStats {
  userId: string;
  userName: string;
  totalHours: number;
  subjectHours: Record<string, number>;
}

interface UserRankingProps {
  userRankingData: Record<string, UserStats[]>;
  user: User;
}

export function UserRanking({ userRankingData, user }: UserRankingProps) {
  const [selectedSubject, setSelectedSubject] = useState('合計');

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

  // 現在のランキングデータ取得
  const getCurrentRankingData = () => {
    const data = userRankingData[selectedSubject] || [];
    
    // ランキング形式に変換
    return data.map((stats, index) => ({
      rank: index + 1,
      name: stats.userName,
      hours: selectedSubject === '合計' 
        ? Math.round(stats.totalHours * 10) / 10
        : Math.round((stats.subjectHours[selectedSubject] || 0) * 10) / 10,
      icon: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}位`,
      isCurrentUser: stats.userId === user?.uid
    }));
  };

  // ランキング表示コンポーネント
  const RankingList = ({ data }: { data: any[] }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          データがありません
        </div>
      ) : (
        data.map((member) => (
          <div key={member.rank} className={`flex items-center justify-between p-3 rounded-lg ${
            member.isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg">{member.icon}</span>
              <div>
                <span className={`font-medium ${member.isCurrentUser ? 'text-blue-700' : ''}`}>
                  {member.name}
                  {member.isCurrentUser && (
                    <Badge variant="outline" className="ml-2">あなた</Badge>
                  )}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{member.hours}時間</div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const availableSubjects = getAvailableSubjects();

  // ドロップダウン用の選択肢
  const subjectOptions = ['合計', ...availableSubjects.map(s => getSubjectDisplayName(s))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏆 全ユーザーランキング
          <Badge variant="default" className="bg-red-500">
            TOP20
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Select onValueChange={(value) => setSelectedSubject(value)} value={selectedSubject}>
            <SelectTrigger className="w-[180px]">
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
          <span className="text-sm text-gray-600">
            過去30日間の学習時間ランキング
          </span>
        </div>
        <div className="space-y-3">
          <RankingList data={getCurrentRankingData()} />
        </div>
      </CardContent>
    </Card>
  );
}