'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { SubjectButton } from '@/components/SubjectButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StudyStats, Subject } from '@/types/study';
import { useRouter } from 'next/navigation';

export default function ReportPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!user) return;
    
    const loadStats = async () => {
      try {
        console.log('📊 Loading stats for user:', user.uid);
        setStatsError(null);
        
        const studyStats = await StudyRecordService.getStudyStats(user.uid);
        console.log('✅ Stats loaded:', studyStats);
        setStats(studyStats);
      } catch (error) {
        console.error('❌ Stats error:', error);
        setStatsError(error instanceof Error ? error.message : 'Stats loading failed');
        // エラー時はデフォルト値を設定
        setStats({
          totalHours: 0,
          weeklyHours: 0,
          subjectHours: {
            英語: 0,
            数学: 0,
            国語: 0,
            情報: 0,
            理科: 0,
            理科1: 0,
            理科2: 0,
            社会: 0,
            社会1: 0,
            社会2: 0
          },
          recentDays: []
        });
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    loadStats();
  }, [user, isLoading, router]);

  // 安全な科目取得
  const getAvailableSubjects = (): Subject[] => {
    const common: Subject[] = ['英語', '数学', '国語', '情報'];
    
    if (user?.course === 'liberal') {
      const subjects: Subject[] = [...common, '社会1', '社会2', '理科'];
      if (user?.subjectSelection?.enableSecondScience) {
        subjects.push('理科2');
      }
      return subjects;
    } else {
      const subjects: Subject[] = [...common, '理科1', '理科2', '社会'];
      if (user?.subjectSelection?.enableSecondSocial) {
        subjects.push('社会2');
      }
      return subjects;
    }
  };

  if (isLoading || isLoadingStats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{isLoading ? 'ユーザー情報を読み込み中...' : '学習データを読み込み中...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const availableSubjects = getAvailableSubjects();
  const weeklyTarget = user.weeklyTarget || 56;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* エラー表示 */}
      {statsError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">⚠️ データ読み込みエラー: {statsError}</p>
            <p className="text-sm text-yellow-600 mt-1">デフォルト値で表示しています</p>
          </CardContent>
        </Card>
      )}

      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            🎯 北大専科 - 学習レポート
          </CardTitle>
          <p className="text-center text-muted-foreground">
            こんにちは、{user.displayName}さん！
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {user.course === 'liberal' ? '📚 文系' : '🔬 理系'}
            </span>
          </p>
        </CardHeader>
      </Card>

      {/* ナビゲーション */}
      <div className="grid grid-cols-4 gap-2">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard')}
          className="h-12"
        >
          👥 メンバー
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/record')}
          className="h-12"
        >
          ✏️ 手動記録
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/profile')}
          className="h-12"
        >
          📊 カルテ
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/settings')}
          className="h-12"
        >
          ⚙️ 設定
        </Button>
      </div>

      {/* 累計進捗 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 累計勉強時間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            {stats?.totalHours?.toFixed(1) || 0}時間 / 目標1,500時間
          </div>
          <Progress 
            value={((stats?.totalHours || 0) / 1500) * 100} 
            className="h-4"
          />
          <div className="text-sm text-muted-foreground mt-1">
            {Math.round(((stats?.totalHours || 0) / 1500) * 100)}% 達成
          </div>
        </CardContent>
      </Card>

      {/* 今週の進捗 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 今週の勉強時間（月〜日）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {stats?.weeklyHours?.toFixed(1) || 0}時間 / 目標{weeklyTarget}時間
          </div>
          <Progress 
            value={((stats?.weeklyHours || 0) / weeklyTarget) * 100} 
            className="h-3"
          />
          <div className="text-sm text-muted-foreground mt-1">
            1日平均目標: {(weeklyTarget / 7).toFixed(1)}時間
          </div>
        </CardContent>
      </Card>

      {/* 今すぐ勉強開始 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔥 今すぐ勉強開始！
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {availableSubjects.map((subject) => (
              <SubjectButton key={subject} subject={subject} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            ↑ワンタップで記録開始
          </p>
        </CardContent>
      </Card>

      {/* 教科別進捗 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📚 教科別進捗
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(stats?.subjectHours || {}).length > 0 ? (
            availableSubjects.map((subject) => {
              const hours = stats?.subjectHours[subject] || 0;
              const targets: Record<Subject, number> = {
                英語: 350, 数学: 400, 国語: 300, 情報: 200,
                理科: 350, 理科1: 175, 理科2: 175,
                社会: 250, 社会1: 125, 社会2: 125
              };
              const target = targets[subject] || 300;
              const percentage = Math.round((hours / target) * 100);
              
              const displayName = user?.customSubjects?.[subject as keyof typeof user.customSubjects] || subject;
              
              return (
                <div key={subject} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{displayName}</span>
                    <span>{hours.toFixed(1)}h / {target}h</span>
                  </div>
                  <Progress value={Math.min(percentage, 100)} />
                  <div className="text-xs text-muted-foreground">
                    {percentage}% 達成
                    {percentage < 50 && <span className="text-yellow-600"> ⚠️ 要注意</span>}
                    {percentage >= 100 && <span className="text-green-600"> ✅ 目標達成！</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-4">
              まだ学習記録がありません。科目ボタンで学習を開始しましょう！
            </p>
          )}
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>継続は力なり。今日も頑張りましょう！💪</p>
      </div>
    </div>
  );
}