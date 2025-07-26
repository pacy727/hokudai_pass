'use client';

import { useState, useEffect } from 'react';
import { useRealtimeStudyStatus, useDeclarations } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Trophy, 
  Medal, 
  Award, 
  BarChart3, 
  ChevronDown, 
  ChevronUp,
  Clock,
  BookOpen,
  User,
  Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Subject, StudyRecord } from '@/types/study';
import { StudyDeclaration } from '@/types/realtime';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, collections } from '@/lib/firebase';

// ユーザー統計データの型定義
interface UserStats {
  userId: string;
  userName: string;
  totalHours: number;
  subjectHours: Record<Subject, number>;
}

// タイムラインアイテムの型定義
interface TimelineItem {
  id: string;
  type: 'study_record';
  userName: string;
  timestamp: Date;
  subject: Subject;
  content: string;
  details?: string;
  studyTime: number; // 分
  icon: string;
  color: string;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { statuses, isLoading: statusLoading } = useRealtimeStudyStatus();
  const { declarations, isLoading: declarationLoading, postDeclaration } = useDeclarations();
  const { toast } = useToast();
  
  const [newDeclaration, setNewDeclaration] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('合計');
  const [showAllDeclarations, setShowAllDeclarations] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [currentTab, setCurrentTab] = useState('studying');
  
  // 全ユーザーデータ用の状態
  const [userRankingData, setUserRankingData] = useState<Record<string, UserStats[]>>({});
  const [allStudyRecords, setAllStudyRecords] = useState<StudyRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userNamesMap, setUserNamesMap] = useState<Map<string, string>>(new Map());
  
  // デバッグ情報
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

  // useEffect でリダイレクト処理
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('🔄 Redirecting to login from dashboard');
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // 全ユーザーデータの読み込み
  useEffect(() => {
    if (user) {
      loadAllUsersData();
    }
  }, [user]);

  // 全ユーザーのデータを取得
  const loadAllUsersData = async () => {
    if (!user) return;
    
    setIsLoadingData(true);
    try {
      console.log('📊 Loading all users dashboard data...');
      
      // 過去30日間の全ユーザーの学習記録を取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      // Firestoreから全ユーザーの学習記録を取得
      const q = query(
        collection(db, collections.studyRecords),
        where('studyDate', '>=', thirtyDaysAgoStr),
        orderBy('studyDate', 'desc'),
        limit(1000) // 全ユーザー対応で増加
      );
      
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0),
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as StudyRecord[];
      
      console.log('📚 All users study records loaded:', records.length);
      setAllStudyRecords(records);
      
      // ユーザー名を取得
      const userIds = Array.from(new Set(records.map(r => r.userId)));
      const userNames = await loadUserNames(userIds);
      setUserNamesMap(userNames);
      
      // デバッグ情報を設定
      const debug = {
        totalRecords: records.length,
        uniqueUsers: userIds.length,
        declarationsCount: declarations.length,
        sampleRecord: records[0] || null,
        userIds: userIds.slice(0, 5), // 最初の5人のIDを表示
        currentUserId: user.uid,
        currentUserName: user.displayName
      };
      setDebugInfo(debug);
      console.log('🔍 Debug info:', debug);
      
      // 全ユーザーの統計計算
      calculateAllUsersStats(records, userNames);
      
      // タイムラインデータ生成（全ユーザーの学習記録のみ）
      generateTimelineData(records, userNames);
      
      // チャートデータ生成（全ユーザーの合計）
      generateAllUsersChartData(records);
      
    } catch (error) {
      console.error('❌ Error loading all users dashboard data:', error);
      setDebugInfo(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
    } finally {
      setIsLoadingData(false);
    }
  };

  // ユーザー名を取得
  const loadUserNames = async (userIds: string[]): Promise<Map<string, string>> => {
    const userNames = new Map<string, string>();
    
    console.log('👥 Loading user names for', userIds.length, 'users');
    
    // バッチでユーザー情報を取得（Firestoreの制限を考慮）
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      try {
        // users コレクションから直接取得
        const usersQuery = query(collection(db, collections.users));
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.docs.forEach(doc => {
          if (batch.includes(doc.id)) {
            const userData = doc.data();
            userNames.set(doc.id, userData.displayName || 'ユーザー');
          }
        });
        
      } catch (error) {
        console.warn('Failed to load user names for batch:', batch, error);
        // エラーの場合はデフォルト名を設定
        batch.forEach(userId => {
          if (!userNames.has(userId)) {
            userNames.set(userId, userId === user?.uid ? user.displayName : 'ユーザー');
          }
        });
      }
    }
    
    console.log('✅ User names loaded:', userNames.size);
    return userNames;
  };

  // 全ユーザーの統計計算
  const calculateAllUsersStats = (records: StudyRecord[], userNames: Map<string, string>) => {
    console.log('📈 Calculating all users stats...');
    
    const userStatsMap = new Map<string, UserStats>();
    
    // 各ユーザーの統計を計算
    records.forEach(record => {
      const userId = record.userId;
      const userName = userNames.get(userId) || 'ユーザー';
      
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId,
          userName,
          totalHours: 0,
          subjectHours: {
            英語: 0, 数学: 0, 国語: 0, 情報: 0,
            理科: 0, 理科1: 0, 理科2: 0,
            社会: 0, 社会1: 0, 社会2: 0
          }
        });
      }
      
      const stats = userStatsMap.get(userId)!;
      const hours = (record.studyMinutes || 0) / 60;
      stats.totalHours += hours;
      stats.subjectHours[record.subject] = (stats.subjectHours[record.subject] || 0) + hours;
    });
    
    const userStatsList = Array.from(userStatsMap.values());
    console.log('📊 User stats calculated for', userStatsList.length, 'users');
    
    // ランキングデータ生成
    const rankingData: Record<string, UserStats[]> = {};
    
    // 総合ランキング
    rankingData['合計'] = userStatsList
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 20); // トップ20
    
    // 科目別ランキング
    const subjects: Subject[] = ['英語', '数学', '国語', '情報', '理科', '理科1', '理科2', '社会', '社会1', '社会2'];
    subjects.forEach(subject => {
      rankingData[subject] = userStatsList
        .filter(stats => stats.subjectHours[subject] > 0)
        .sort((a, b) => b.subjectHours[subject] - a.subjectHours[subject])
        .slice(0, 20); // トップ20
    });
    
    setUserRankingData(rankingData);
    console.log('🏆 Ranking data generated');
  };

  // タイムラインデータ生成（全ユーザーの学習記録のみ）
  const generateTimelineData = (records: StudyRecord[], userNames: Map<string, string>) => {
    console.log('🕒 Generating timeline data for all users...');
    
    const timelineItems: TimelineItem[] = [];
    
    // 学習記録をタイムラインに追加（最新100件）
    records.slice(0, 100).forEach(record => {
      const userName = userNames.get(record.userId) || 'ユーザー';
      
      timelineItems.push({
        id: `study_${record.id}`,
        type: 'study_record',
        userName: userName,
        timestamp: record.createdAt,
        subject: record.subject,
        content: record.content,
        details: record.details,
        studyTime: record.studyMinutes || 0,
        icon: '📚',
        color: 'bg-green-100 border-green-300 text-green-800'
      });
    });
    
    // 時系列順にソート（新しい順）
    const sortedItems = timelineItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    console.log('✅ Timeline items generated:', sortedItems.length);
    setTimelineData(sortedItems);
  };

  // 全ユーザーのチャートデータ生成（直近10日間の合計）
  const generateAllUsersChartData = (records: StudyRecord[]) => {
    console.log('📊 Generating chart data for all users...');
    
    const today = new Date();
    const chartData = [];
    
    // 日付ごとの全ユーザー学習時間を集計
    const studyByDate: Record<string, number> = {};
    
    records.forEach(record => {
      const date = record.studyDate;
      if (!studyByDate[date]) {
        studyByDate[date] = 0;
      }
      studyByDate[date] += record.studyMinutes || 0;
    });
    
    console.log('📅 All users study by date:', studyByDate);
    
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
    
    console.log('📈 All users chart data generated:', chartData);
    setChartData(chartData);
  };

  const handlePostDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeclaration.trim() || !user) return;

    setIsPosting(true);
    try {
      await postDeclaration(newDeclaration.trim());
      setNewDeclaration('');
      toast({
        title: "宣言完了！",
        description: "学習宣言を投稿しました。頑張って！"
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "宣言の投稿に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

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
        : Math.round((stats.subjectHours[selectedSubject as Subject] || 0) * 10) / 10,
      icon: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}位`,
      isCurrentUser: stats.userId === user?.uid
    }));
  };

  // 表示する宣言を取得
  const getDisplayDeclarations = () => {
    const recentDeclarations = declarations.slice(0, 50);
    return showAllDeclarations ? recentDeclarations : recentDeclarations.slice(0, 15);
  };

  // タイムライン表示制限
  const getDisplayTimelineItems = () => {
    return showAllTimeline ? timelineData : timelineData.slice(0, 30);
  };

  // ランキング表示コンポーネント
  const RankingList = ({ data }: { data: any[] }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          データがありません
          <div className="text-xs mt-2 text-gray-400">
            デバッグ: 選択科目={selectedSubject}, ランキングデータ数={Object.keys(userRankingData).length}
          </div>
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

  // チャートのツールチップフォーマット
  const formatTooltip = (value: number, name: string) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const timeString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    return [timeString, '全ユーザー合計学習時間'];
  };

  // タイムラインアイテムコンポーネント
  const TimelineItemComponent = ({ item }: { item: TimelineItem }) => (
    <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
          <span className="text-lg">{item.icon}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm">{item.userName}</span>
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

  // ローディング中
  if (isLoading || statusLoading || declarationLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>読み込み中...</p>
          {isLoadingData && <p className="text-sm text-gray-500 mt-2">全ユーザーのデータを取得中...</p>}
        </div>
      </div>
    );
  }

  // ユーザー未ログイン（リダイレクト処理中）
  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p>リダイレクト中...</p>
        </div>
      </div>
    );
  }

  const studyingMembers = statuses.filter(status => status.isStudying);
  const notStudyingMembers = statuses.filter(status => !status.isStudying);
  const availableSubjects = getAvailableSubjects();

  // ドロップダウン用の選択肢
  const subjectOptions = ['合計', ...availableSubjects.map(s => getSubjectDisplayName(s))];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* デバッグ情報表示 */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-sm">🔍 デバッグ情報（全ユーザーデータ版）</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>データ件数:</strong><br/>
              全学習記録: {debugInfo.totalRecords || 0}件<br/>
              ユーザー数: {debugInfo.uniqueUsers || 0}人<br/>
              学習宣言: {debugInfo.declarationsCount || 0}件<br/>
              タイムライン: {timelineData.length}件<br/>
              チャート: {chartData.length}件
            </div>
            <div>
              <strong>現在のユーザー:</strong><br/>
              ID: {debugInfo.currentUserId}<br/>
              名前: {debugInfo.currentUserName}<br/>
              <strong>ユーザー名取得:</strong><br/>
              {userNamesMap.size}人分取得済み
            </div>
          </div>
          {debugInfo.error && (
            <div className="mt-2 text-red-600">
              <strong>エラー:</strong> {debugInfo.error}
            </div>
          )}
          {debugInfo.sampleRecord && (
            <details className="mt-2">
              <summary className="cursor-pointer">サンプル学習記録</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(debugInfo.sampleRecord, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="studying" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            学習中のメンバー
          </TabsTrigger>
          <TabsTrigger value="declarations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            学習宣言
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            学習記録タイムライン
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            全体ランキング
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            全体チャート
          </TabsTrigger>
        </TabsList>

        {/* 学習中のメンバータブ */}
        <TabsContent value="studying" className="space-y-4 mt-6">
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
                studyingMembers.map((status) => (
                  <div key={status.userId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{status.userName}</span>
                        <Badge variant="outline">{getSubjectDisplayName(status.currentSubject)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(status.startTime, { locale: ja })}継続中
                      </p>
                    </div>
                  </div>
                ))
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
                    {notStudyingMembers.map((status) => (
                      <div key={status.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>{status.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground text-right">
                最終更新: {formatDistanceToNow(new Date(), { locale: ja })}前
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 学習宣言タブ */}
        <TabsContent value="declarations" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📢 学習宣言
                <Badge variant="default" className="bg-purple-500">
                  {declarations.length}件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handlePostDeclaration} className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="学習宣言を投稿"
                  value={newDeclaration}
                  onChange={(e) => setNewDeclaration(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newDeclaration.trim() || isPosting}>
                  {isPosting ? '投稿中...' : '投稿'}
                </Button>
              </form>
              <div className="space-y-3">
                {getDisplayDeclarations().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    学習宣言がありません
                    <div className="text-xs mt-2 text-gray-400">
                      デバッグ: 宣言データ数={declarations.length}
                    </div>
                  </div>
                ) : (
                  getDisplayDeclarations().map((declaration) => (
                    <div key={declaration.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{declaration.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {formatDistanceToNow(declaration.createdAt, { locale: ja })}前
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-800">{declaration.declaration}</p>
                      </div>
                    </div>
                  ))
                )}
                {declarations.length > 15 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllDeclarations(!showAllDeclarations)}
                    className="w-full"
                  >
                    {showAllDeclarations ? '宣言を閉じる' : 'さらに表示'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* タイムラインタブ（全ユーザーの学習記録のみ） */}
        <TabsContent value="timeline" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📚 学習記録タイムライン（全ユーザー）
                <Badge variant="default" className="bg-yellow-500">
                  {timelineData.length}件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {getDisplayTimelineItems().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    学習記録がありません
                    <div className="text-xs mt-2 text-gray-400">
                      デバッグ: 全ユーザー学習記録数={timelineData.length}
                    </div>
                  </div>
                ) : (
                  getDisplayTimelineItems().map((item) => (
                    <TimelineItemComponent key={item.id} item={item} />
                  ))
                )}
                {timelineData.length > 30 && (
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
        </TabsContent>

        {/* ランキングタブ（全ユーザー） */}
        <TabsContent value="ranking" className="space-y-4 mt-6">
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
        </TabsContent>

        {/* チャートタブ（全ユーザーの合計） */}
        <TabsContent value="chart" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 全ユーザー合計学習時間チャート
                <Badge variant="default" className="bg-indigo-500">
                  直近10日
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chartData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  チャートデータがありません
                  <div className="text-xs mt-2 text-gray-400">
                    デバッグ: 全ユーザーチャートデータ数={chartData.length}
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
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
                        <Line 
                          type="monotone" 
                          dataKey="minutes" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* 全ユーザー統計 */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {Math.round(chartData.reduce((sum, day) => sum + day.minutes, 0) / 60)}h
                      </div>
                      <div className="text-xs text-muted-foreground">全ユーザー10日合計</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {chartData.length > 0 ? Math.round(chartData.reduce((sum, day) => sum + day.minutes, 0) / chartData.length) : 0}分
                      </div>
                      <div className="text-xs text-muted-foreground">1日平均</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {chartData.length > 0 ? Math.max(...chartData.map(d => d.minutes)) : 0}分
                      </div>
                      <div className="text-xs text-muted-foreground">最高記録日</div>
                    </div>
                  </div>
                  
                  {/* デバッグ情報 */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-gray-500">チャートデータ詳細</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                      {JSON.stringify(chartData, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}