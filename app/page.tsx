'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { SubjectButton } from '@/components/SubjectButton';
import { ProgressChart } from '@/components/charts/ProgressChart';
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

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!user) return;
    
    const loadStats = async () => {
      try {
        const studyStats = await StudyRecordService.getStudyStats(user.uid);
        setStats(studyStats);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    loadStats();
  }, [user, isLoading, router]);

  if (isLoading || isLoadingStats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            🎯 北大専科 - 学習レポート
          </CardTitle>
          <p className="text-center text-muted-foreground">
            こんにちは、{user.displayName}さん！
          </p>
        </CardHeader>
      </Card>

      {/* ナビゲーション */}
      <div className="grid grid-cols-3 gap-2">
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
            {stats?.totalHours.toFixed(1) || 0}時間 / 目標1,500時間
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
            📅 今週の勉強時間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {stats?.weeklyHours.toFixed(1) || 0}時間 / 目標56時間
          </div>
          <Progress 
            value={((stats?.weeklyHours || 0) / 56) * 100} 
            className="h-3"
          />
          <div className="text-sm text-muted-foreground mt-1">
            週平均8時間 × 7日
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
          <div className="grid grid-cols-5 gap-2">
            <SubjectButton subject="数学" />
            <SubjectButton subject="英語" />
            <SubjectButton subject="国語" />
            <SubjectButton subject="理科" />
            <SubjectButton subject="社会" />
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            ↑ワンタップで記録開始
          </p>
        </CardContent>
      </Card>

      {/* 過去7日間のグラフ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 過去7日間の勉強時間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart data={stats?.recentDays || []} />
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
          {Object.entries(stats?.subjectHours || {}).map(([subject, hours]) => {
            const targets = { 数学: 400, 英語: 350, 国語: 300, 理科: 350, 社会: 250 };
            const target = targets[subject as Subject] || 300;
            const percentage = Math.round((hours / target) * 100);
            
            return (
              <div key={subject} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{subject}</span>
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
          })}
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>継続は力なり。今日も頑張りましょう！💪</p>
      </div>
    </div>
  );
}
