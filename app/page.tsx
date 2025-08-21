'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { ReviewService } from '@/lib/db/reviewService';
import { SubjectButton } from '@/components/SubjectButton';
import { SubjectStudyTimeCard } from '@/components/SubjectStudyTimeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { StudyStats, Subject, StudyRecord } from '@/types/study';
import { TodayTask } from '@/types/review';
import { useRouter } from 'next/navigation';
import { Clock, Target, BookOpen, Flame, Calendar, TrendingUp, AlertTriangle, Trophy, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<StudyRecord[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [studyStreak, setStudyStreak] = useState(0);
  const [noStudyStreak, setNoStudyStreak] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  // 30種類の励ましメッセージ
  const motivationMessages = [
    "今日も学習を始めましょう！小さな一歩が大きな成果に繋がります 🌱",
    "継続は力なり。今日の努力が未来の自分を作ります 💪",
    "北大合格への道は一歩ずつ。今日も前進しましょう 🎯",
    "勉強は裏切らない。今日の頑張りが必ず実を結びます 📚",
    "夢に向かって、今日も全力で取り組みましょう ✨",
    "困難は成長のチャンス。今日も挑戦していきましょう 🔥",
    "毎日の積み重ねが、大きな変化を生み出します 🏔️",
    "今日学んだことが、明日の力になります 💡",
    "限界を超えるのは今日かもしれません。頑張りましょう 🚀",
    "成功への道は毎日の学習から始まります 🌟",
    "今日も自分史上最高の学習をしましょう 👑",
    "勉強した分だけ、未来が明るくなります ☀️",
    "今この瞬間から、未来が変わり始めます ⏰",
    "諦めなければ、必ず道は開けます 🗝️",
    "今日の努力が、明日の自信になります 💎",
    "学ぶことで、新しい世界が見えてきます 🌍",
    "一日一歩、確実に目標に近づいています 🎯",
    "今日も成長のための貴重な時間です 🌱",
    "努力は絶対に無駄になりません。今日も頑張りましょう 💪",
    "学習は自分への最高の投資です 💰",
    "今日の集中が、将来の成功を決めます 🎯",
    "挑戦する勇気が、新しい可能性を開きます 🚪",
    "今日も知識という宝物を集めましょう 💎",
    "努力の先に、必ず光が見えてきます ✨",
    "今日学んだことが、一生の財産になります 📖",
    "毎日少しずつでも、確実に前進しています 🏃‍♂️",
    "今日の頑張りが、明日の笑顔を作ります 😊",
    "学習は自分を高める最高の方法です 📈",
    "今日も新しい発見がきっと待っています 🔍",
    "努力した分だけ、自分に自信が持てます 🌟"
  ];

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!user) return;
    
    const loadData = async () => {
      try {
        console.log('📊 Loading homepage data for user:', user.uid);
        setStatsError(null);
        
        // 統計データ
        const studyStats = await StudyRecordService.getStudyStats(user.uid);
        setStats(studyStats);
        
        // 全ての学習記録を取得（チャート用）
        const allRecords = await StudyRecordService.getRecordsByUser(user.uid);
        
        // チャートデータを生成
        const chartData = generateChartData(allRecords);
        setChartData(chartData);
        
        // 最近の学習記録（10件取得して分析用）
        const records = await StudyRecordService.getRecordsByUser(user.uid, 10);
        setRecentRecords(records);
        
        // 今日のタスク
        const tasks = await ReviewService.getTodayTasks(user.uid);
        setTodayTasks(tasks);
        
        // 学習ストリーク計算
        calculateStudyStreak(allRecords);
        
      } catch (error) {
        console.error('❌ Error loading homepage data:', error);
        setStatsError(error instanceof Error ? error.message : 'データ読み込みエラー');
        setStats({
          totalHours: 0,
          weeklyHours: 0,
          subjectHours: {
            英語: 0, 数学: 0, 国語: 0, 情報: 0,
            理科: 0, 理科1: 0, 理科2: 0,
            社会: 0, 社会1: 0, 社会2: 0
          },
          recentDays: []
        });
        // エラー時は空のチャートデータを設定
        setChartData(generateChartData([]));
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    loadData();
  }, [user, isLoading, router]);

  // 直近10日間のチャートデータを生成
  const generateChartData = (records: StudyRecord[]) => {
    const today = new Date();
    const chartData = [];
    
    // 日付ごとの学習時間を集計
    const studyByDate: Record<string, number> = {};
    
    records.forEach(record => {
      const date = record.studyDate;
      if (!studyByDate[date]) {
        studyByDate[date] = 0;
      }
      studyByDate[date] += record.studyMinutes || 0;
    });
    
    // 直近10日間のデータを生成
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayOfWeek = dayNames[date.getDay()];
      const shortDate = `${date.getMonth() + 1}/${date.getDate()}`;
      
      chartData.push({
        date: shortDate,
        minutes: studyByDate[dateStr] || 0,
        dateLabel: `${shortDate}(${dayOfWeek})`
      });
    }
    
    return chartData;
  };

  const calculateStudyStreak = (records: StudyRecord[]) => {
    if (records.length === 0) {
      setStudyStreak(0);
      setNoStudyStreak(1);
      return;
    }

    const today = new Date();
    let studyStreakCount = 0;
    let noStudyStreakCount = 0;
    let currentDate = new Date(today);
    
    // 日付ごとの学習記録をグループ化
    const recordsByDate = records.reduce((acc, record) => {
      const date = record.studyDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, StudyRecord[]>);

    // 今日から遡って連続学習日数をカウント
    let foundStudyDay = false;
    while (currentDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) { // 最大30日遡る
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayRecords = recordsByDate[dateStr] || [];
      const dayTotal = dayRecords.reduce((sum, r) => sum + r.studyMinutes, 0);
      
      if (dayTotal >= 0.5) { // 30分以上学習した日をカウント
        if (!foundStudyDay) {
          foundStudyDay = true;
        }
        studyStreakCount++;
        noStudyStreakCount = 0; // 勉強した日があるのでリセット
      } else {
        if (foundStudyDay) {
          break; // 勉強していた期間の途切れ
        } else {
          noStudyStreakCount++; // 最近勉強していない日数をカウント
        }
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    setStudyStreak(studyStreakCount);
    setNoStudyStreak(foundStudyDay ? 0 : noStudyStreakCount);
  };

  // 利用可能科目の取得
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

  // ランダム励ましメッセージ取得
  const getRandomMotivationMessage = () => {
    const randomIndex = Math.floor(Math.random() * motivationMessages.length);
    return motivationMessages[randomIndex];
  };

  // 総学習時間に応じたイラスト・称号取得
  const getStudyAchievement = (totalHours: number) => {
    if (totalHours >= 1000) return { emoji: "🏆", title: "学習マスター", description: "1000時間達成！" };
    if (totalHours >= 500) return { emoji: "🥇", title: "努力の天才", description: "500時間達成！" };
    if (totalHours >= 300) return { emoji: "🥈", title: "学習エキスパート", description: "300時間達成！" };
    if (totalHours >= 200) return { emoji: "🥉", title: "継続の力", description: "200時間達成！" };
    if (totalHours >= 100) return { emoji: "🌟", title: "学習者", description: "100時間達成！" };
    if (totalHours >= 50) return { emoji: "📚", title: "新人学習者", description: "50時間達成！" };
    if (totalHours >= 20) return { emoji: "🌱", title: "学習の芽", description: "20時間達成！" };
    if (totalHours >= 10) return { emoji: "🔰", title: "初心者", description: "10時間達成！" };
    if (totalHours >= 1) return { emoji: "👶", title: "学習スタート", description: "最初の1時間！" };
    return { emoji: "🌱", title: "これから", description: "学習を始めましょう！" };
  };

  // チャートのツールチップフォーマット
  const formatTooltip = (value: number, name: string) => {
    return [`${value}分`, '学習時間'];
  };

  // Y軸のティック値を60分刻みで生成
  const generateYAxisTicks = (maxValue: number) => {
    const ticks = [0];
    let tick = 60;
    while (tick <= maxValue + 60) {
      ticks.push(tick);
      tick += 60;
    }
    return ticks;
  };

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

  const availableSubjects = getAvailableSubjects();
  const weeklyTarget = user.weeklyTarget || 56;
  const urgentTasks = todayTasks.filter(t => t.isOverdue && t.daysPastDue && t.daysPastDue > 0);
  const todayDueTasks = todayTasks.filter(t => !t.isOverdue || !t.daysPastDue || t.daysPastDue === 0);
  const achievement = getStudyAchievement(stats?.totalHours || 0);
  
  // チャートの最大値を取得
  const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.minutes)) : 0;
  const yAxisTicks = generateYAxisTicks(maxChartValue);

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

      {/* 励ましメッセージ */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <p className="text-center text-green-800 font-medium">
            {getRandomMotivationMessage()}
          </p>
        </CardContent>
      </Card>

      {/* 今すぐ勉強開始！ */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
            <BookOpen className="w-5 h-5" />
            今すぐ勉強開始！
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {availableSubjects.map((subject) => (
              <SubjectButton key={subject} subject={subject} />
            ))}
          </div>
          <p className="text-sm text-blue-600 mt-2 text-center font-medium">
            ↑ワンタップで記録開始
          </p>
        </CardContent>
      </Card>

      {/* 復習アラート */}
      {todayTasks.length > 0 && (
        <Card className={urgentTasks.length > 0 ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={`w-5 h-5 ${urgentTasks.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
              復習アラート
              <Badge variant="destructive" className="ml-auto">
                {todayTasks.length}件
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.length > 0 && (
                <div className="text-sm text-red-700">
                  🔥 期限切れ {urgentTasks.length}件 - 優先的に復習しましょう
                </div>
              )}
              {todayDueTasks.length > 0 && (
                <div className="text-sm text-orange-700">
                  ⚠️ 今日期限 {todayDueTasks.length}件
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/profile')} 
              className="w-full mt-3"
            >
              復習を開始する
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 今週の目標と学習ストリーク */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 今週の目標進捗 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5" />
              今週の目標（月〜日）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {stats?.weeklyHours?.toFixed(1) || 0}時間 / {weeklyTarget}時間
            </div>
            <Progress 
              value={((stats?.weeklyHours || 0) / weeklyTarget) * 100} 
              className="h-3 mb-2" 
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Math.round(((stats?.weeklyHours || 0) / weeklyTarget) * 100)}% 達成</span>
              <span>1日平均目標: {(weeklyTarget / 7).toFixed(1)}時間</span>
            </div>
          </CardContent>
        </Card>

        {/* 学習ストリーク */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="w-5 h-5" />
              学習ストリーク
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studyStreak > 0 ? (
              <div className="text-2xl font-bold mb-2 flex items-center gap-2 text-green-600">
                🔥 {studyStreak}日連続！
              </div>
            ) : (
              <div className="text-2xl font-bold mb-2 flex items-center gap-2 text-orange-600">
                ⚠️ {noStudyStreak}日連続で勉強していません
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {studyStreak > 0 
                ? "素晴らしい継続力です！この調子で頑張りましょう" 
                : "今日から新しいストリークを始めませんか？"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 学習チャート（コンパクト） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            直近10日間の学習時間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ value: '分', angle: -90, position: 'insideLeft' }}
                  domain={[0, 'dataMax']}
                  ticks={yAxisTicks}
                  interval={0}
                />
                <Tooltip 
                  formatter={formatTooltip}
                  labelFormatter={(label) => {
                    const data = chartData.find(d => d.date === label);
                    return data ? data.dateLabel : label;
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '6px'
                  }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* 簡易統計 */}
          <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {Math.round(chartData.reduce((sum, day) => sum + day.minutes, 0) / 60)}h
              </div>
              <div className="text-xs text-muted-foreground">10日合計</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {chartData.length > 0 ? Math.round(chartData.reduce((sum, day) => sum + day.minutes, 0) / chartData.length) : 0}分
              </div>
              <div className="text-xs text-muted-foreground">日平均</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {chartData.length > 0 ? Math.max(...chartData.map(d => d.minutes)) : 0}分
              </div>
              <div className="text-xs text-muted-foreground">最高記録</div>
            </div>
          </div>
        </CardContent>
      </Card>
     
      {/* 最近の学習履歴 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            最近の学習履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.slice(0, 3).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{record.subject}</Badge>
                    <span className="text-sm">{record.content}</span>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{record.studyMinutes}分</div>
                    <div>{record.studyDate}</div>
                  </div>
                </div>
              ))}
              <Button 
                variant="ghost" 
                onClick={() => router.push('/profile?tab=timeline')} 
                className="w-full text-sm"
              >
                すべての履歴を見る
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              まだ学習記録がありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 教科別学習時間 */}
      <SubjectStudyTimeCard 
        studyRecords={recentRecords.length > 0 ? recentRecords : []}
        user={user}
      />

      {/* 総学習時間と達成度 */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-purple-800">
            <Trophy className="w-5 h-5" />
            学習の軌跡
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl mb-2">{achievement.emoji}</div>
            <div className="text-2xl font-bold text-purple-800 mb-1">
              {stats?.totalHours?.toFixed(1) || 0}時間
            </div>
            <div className="text-lg font-semibold text-purple-600 mb-1">
              {achievement.title}
            </div>
            <div className="text-sm text-purple-500">
              {achievement.description}
            </div>
            <div className="mt-4 text-xs text-purple-400">
              積み重ねた努力は必ず実を結びます
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}