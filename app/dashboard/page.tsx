'use client';

import { useState, useEffect } from 'react';
import { useRealtimeStudyStatus, useDeclarations } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, collections } from '@/lib/firebase';
import { StudyRecord } from '@/types/study';
import { useRouter } from 'next/navigation';
import { Clock, Users, Trophy, BarChart3, MessageSquare } from 'lucide-react';

// ダッシュボード用コンポーネント
import { StudyingMembers } from '@/components/dashboard/StudyingMembers';
import { StudyDeclarations } from '@/components/dashboard/StudyDeclarations';
import { StudyTimeline } from '@/components/dashboard/StudyTimeline';
import { UserRanking } from '@/components/dashboard/UserRanking';
import { StudyChart } from '@/components/dashboard/StudyChart';

// ユーザー統計データの型定義
interface UserStats {
  userId: string;
  userName: string;
  totalHours: number;
  subjectHours: Record<string, number>;
}

// タイムラインアイテムの型定義
interface TimelineItem {
  id: string;
  type: 'study_record';
  userName: string;
  timestamp: Date;
  subject: string;
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
  
  const [currentTab, setCurrentTab] = useState('studying');
  
  // 全ユーザーデータ用の状態
  const [userRankingData, setUserRankingData] = useState<Record<string, UserStats[]>>({});
  const [allStudyRecords, setAllStudyRecords] = useState<StudyRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userNamesMap, setUserNamesMap] = useState<Map<string, string>>(new Map());

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
      
      // 全ユーザーの統計計算
      calculateAllUsersStats(records, userNames);
      
      // タイムラインデータ生成（全ユーザーの学習記録のみ）
      generateTimelineData(records, userNames);
      
      // チャートデータ生成（全ユーザーの合計）
      generateAllUsersChartData(records);
      
    } catch (error) {
      console.error('❌ Error loading all users dashboard data:', error);
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
          subjectHours: {}
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
    const subjects = ['英語', '数学', '国語', '情報', '理科', '理科1', '理科2', '社会', '社会1', '社会2'];
    subjects.forEach(subject => {
      rankingData[subject] = userStatsList
        .filter(stats => stats.subjectHours[subject] > 0)
        .sort((a, b) => (b.subjectHours[subject] || 0) - (a.subjectHours[subject] || 0))
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
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
          <StudyingMembers 
            studyingMembers={studyingMembers}
            notStudyingMembers={notStudyingMembers}
            user={user}
          />
        </TabsContent>

        {/* 学習宣言タブ */}
        <TabsContent value="declarations" className="space-y-4 mt-6">
          <StudyDeclarations 
            declarations={declarations}
            postDeclaration={postDeclaration}
            user={user}
          />
        </TabsContent>

        {/* タイムラインタブ（全ユーザーの学習記録のみ） */}
        <TabsContent value="timeline" className="space-y-4 mt-6">
          <StudyTimeline 
            timelineData={timelineData}
            user={user}
          />
        </TabsContent>

        {/* ランキングタブ（全ユーザー） */}
        <TabsContent value="ranking" className="space-y-4 mt-6">
          <UserRanking 
            userRankingData={userRankingData}
            user={user}
          />
        </TabsContent>

        {/* チャートタブ（ユーザー別） */}
        <TabsContent value="chart" className="space-y-4 mt-6">
          <StudyChart 
            chartData={chartData}
            allStudyRecords={allStudyRecords}
            userNamesMap={userNamesMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}