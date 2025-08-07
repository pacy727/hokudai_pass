'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { RealtimeStudyStatus } from '@/types/realtime';
import { User } from '@/types/auth';

interface StudyingMembersProps {
  studyingMembers: RealtimeStudyStatus[];
  notStudyingMembers: RealtimeStudyStatus[];
  user: User;
  userGradesMap?: Map<string, string>; // 学年情報マップを追加
}

export function StudyingMembers({ 
  studyingMembers, 
  notStudyingMembers, 
  user,
  userGradesMap = new Map()
}: StudyingMembersProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📍 現在学習中のメンバー
          <Badge variant="default" className="bg-green-500">
            {studyingMembers.length}人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {studyingMembers.length > 0 ? (
          studyingMembers.map((status) => {
            const userGrade = userGradesMap.get(status.userId);
            return (
              <div key={status.userId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{status.userName}</span>
                    {userGrade && (
                      <Badge variant="outline" className="text-xs bg-gray-100">
                        🎓 {getGradeDisplayName(userGrade)}
                      </Badge>
                    )}
                    <Badge variant="outline">{getSubjectDisplayName(status.currentSubject)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(status.startTime, { locale: ja })}継続中
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">現在学習中のメンバーはいません</p>
            <p className="text-sm text-muted-foreground">あなたが最初に勉強を始めませんか？</p>
          </div>
        )}
        
        {notStudyingMembers.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">オフラインメンバー</h4>
            <div className="grid grid-cols-2 gap-2">
              {notStudyingMembers.map((status) => {
                const userGrade = userGradesMap.get(status.userId);
                return (
                  <div key={status.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{status.userName}</span>
                      {userGrade && (
                        <Badge variant="outline" className="text-xs bg-gray-100 w-fit mt-1">
                          🎓 {getGradeDisplayName(userGrade)}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-right">
          最終更新: {formatDistanceToNow(new Date(), { locale: ja })}前
        </div>
      </CardContent>
    </Card>
  );
}