'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Calendar,
  Shield,
  Search,
  Filter,
  BarChart3,
  Award,
  AlertCircle,
  MessageSquare,
  ArrowLeft,
  Download,
  RefreshCw,
  GraduationCap,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { ReviewStatsService } from '@/lib/db/reviewStatsService';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, collections } from '@/lib/firebase';
import { StudyRecord, Subject } from '@/types/study';
import { ReviewQuestionRequest } from '@/types/review';
import { useToast } from '@/components/ui/use-toast';

// ユーザー統計データの型定義
interface UserStats {
  userId: string;
  userName: string;
  email: string;
  grade?: string;
  course?: 'liberal' | 'science';
  createdAt: Date;
  lastActive: Date;
  totalStudyHours: number;
  weeklyStudyHours: number;
  reviewsCompleted: number;
  averageUnderstanding: number;
  reviewRequests: number;
  currentStreak: number;
  isActive: boolean;
}

// 本番データに対応したタイムラインアイテムの型定義
interface TimelineItem {
  id: string;
  type: 'study_record';
  userName: string;
  userId: string;
  timestamp: Date;
  subject: string;
  content: string;
  details?: string;
  studyTime: number; // 分
  icon: string;
  color: string;
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentTab, setCurrentTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('全学年');
  const [courseFilter, setCourseFilter] = useState('全コース');
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studyPeriod, setStudyPeriod] = useState('7days');
  
  // データ状態
  const [users, setUsers] = useState<UserStats[]>([]);
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewQuestionRequest[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  // データ読み込み
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      console.log('📊 Loading admin dashboard data...');
      
      // 並行してデータを取得
      const [usersData, studyRecordsData, reviewRequestsData] = await Promise.all([
        loadUsers(),
        loadStudyRecords(),
        loadReviewRequests()
      ]);

      // チャートデータとタイムラインデータを生成
      generateChartData(studyRecordsData);
      generateSubjectData(studyRecordsData);
      generateTimelineData(studyRecordsData, usersData);
      
      console.log('✅ All admin dashboard data loaded');
    } catch (error) {
      console.error('❌ Error loading admin dashboard data:', error);
      toast({
        title: "データ読み込みエラー",
        description: "管理ボードのデータ読み込みに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // ユーザーデータ読み込み
  const loadUsers = async (): Promise<Map<string, any>> => {
    try {
      console.log('👥 Loading users data...');
      
      const usersSnapshot = await getDocs(collection(db, collections.users));
      const userMap = new Map<string, any>();
      const usersList: UserStats[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // 復習統計を取得
        let reviewStats;
        try {
          reviewStats = await ReviewStatsService.calculateUserReviewStats(userId);
        } catch (error) {
          console.warn(`Failed to load review stats for user ${userId}:`, error);
          reviewStats = {
            totalReviewsCompleted: 0,
            averageUnderstanding: 0
          };
        }

        // 学習記録から統計を計算
        const userStudyRecords = await StudyRecordService.getRecordsByUser(userId);
        const totalStudyMinutes = userStudyRecords.reduce((sum, record) => sum + (record.studyMinutes || 0), 0);
        const totalStudyHours = totalStudyMinutes / 60;

        // 今週の学習時間を計算
        const now = new Date();
        const weekStart = new Date(now.getTime() - (now.getDay() || 7) * 24 * 60 * 60 * 1000);
        weekStart.setHours(0, 0, 0, 0);
        
        const weeklyRecords = userStudyRecords.filter(record => {
          const recordDate = new Date(record.studyDate + 'T00:00:00');
          return recordDate >= weekStart;
        });
        const weeklyStudyMinutes = weeklyRecords.reduce((sum, record) => sum + (record.studyMinutes || 0), 0);
        const weeklyStudyHours = weeklyStudyMinutes / 60;

        // 復習問題リクエスト数を取得
        const userRequests = await ReviewQuestionRequestService.getUserRequests(userId);
        
        // 学習ストリーク計算（簡易版）
        const currentStreak = calculateStudyStreak(userStudyRecords);
        
        // 最終活動日を計算
        const lastActiveRecord = userStudyRecords.length > 0 ? userStudyRecords[0] : null;
        const lastActive = lastActiveRecord ? new Date(lastActiveRecord.studyDate) : userData.createdAt?.toDate() || new Date();
        
        // アクティブ判定（過去7日以内に学習記録があるか）
        const isActive = lastActiveRecord && 
          new Date(lastActiveRecord.studyDate) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const userStats: UserStats = {
          userId,
          userName: userData.displayName || 'ユーザー',
          email: userData.email || '',
          grade: userData.grade || 'その他',
          course: userData.course || 'science',
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastActive,
          totalStudyHours,
          weeklyStudyHours,
          reviewsCompleted: reviewStats.totalReviewsCompleted,
          averageUnderstanding: reviewStats.averageUnderstanding,
          reviewRequests: userRequests.length,
          currentStreak,
          isActive: !!isActive
        };

        userMap.set(userId, userData);
        usersList.push(userStats);
      }
      
      setUsers(usersList);
      console.log(`✅ Loaded ${usersList.length} users`);
      return userMap;
    } catch (error) {
      console.error('❌ Error loading users:', error);
      return new Map();
    }
  };

  // 学習記録データ読み込み
  const loadStudyRecords = async (): Promise<StudyRecord[]> => {
    try {
      console.log('📚 Loading study records...');
      
      // 過去30日間の学習記録を取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const recordsQuery = query(
        collection(db, collections.studyRecords),
        where('studyDate', '>=', thirtyDaysAgoStr),
        orderBy('studyDate', 'desc')
      );
      
      const recordsSnapshot = await getDocs(recordsQuery);
      const records = recordsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0),
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as StudyRecord[];
      
      setStudyRecords(records);
      console.log(`✅ Loaded ${records.length} study records`);
      return records;
    } catch (error) {
      console.error('❌ Error loading study records:', error);
      return [];
    }
  };

  // 復習問題リクエストデータ読み込み
  const loadReviewRequests = async (): Promise<ReviewQuestionRequest[]> => {
    try {
      console.log('📋 Loading review requests...');
      
      const requests = await ReviewQuestionRequestService.getAllRequests();
      setReviewRequests(requests);
      console.log(`✅ Loaded ${requests.length} review requests`);
      return requests;
    } catch (error) {
      console.error('❌ Error loading review requests:', error);
      return [];
    }
  };

  // 学習ストリーク計算
  const calculateStudyStreak = (records: StudyRecord[]): number => {
    if (records.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // 日付ごとの学習記録をグループ化
    const recordsByDate = records.reduce((acc, record) => {
      const date = record.studyDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, StudyRecord[]>);

    // 今日から遡って連続学習日数をカウント
    while (currentDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayRecords = recordsByDate[dateStr] || [];
      const dayTotal = dayRecords.reduce((sum, r) => sum + (r.studyMinutes || 0), 0);
      
      if (dayTotal >= 30) { // 30分以上学習した日をカウント
        streak++;
      } else if (streak > 0) {
        break; // 連続記録の途切れ
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };

  // チャートデータ生成
  const generateChartData = (records: StudyRecord[]) => {
    const today = new Date();
    const data = [];
    
    const period = studyPeriod === '7days' ? 7 : 30;
    
    // 日付ごとの学習時間を集計
    const studyByDate: Record<string, number> = {};
    records.forEach(record => {
      const date = record.studyDate;
      if (!studyByDate[date]) {
        studyByDate[date] = 0;
      }
      studyByDate[date] += (record.studyMinutes || 0) / 60; // 時間に変換
    });
    
    // 指定期間のデータを生成
    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayOfWeek = dayNames[date.getDay()];
      const shortDate = `${date.getMonth() + 1}/${date.getDate()}`;
      
      data.push({
        date: shortDate,
        value: studyByDate[dateStr] || 0,
        dateLabel: `${shortDate}(${dayOfWeek})`
      });
    }
    
    setChartData(data);
  };

  // 科目データ生成
  const generateSubjectData = (records: StudyRecord[]) => {
    const subjectMinutes: Record<string, number> = {};
    
    records.forEach(record => {
      const subject = record.subject;
      if (!subjectMinutes[subject]) {
        subjectMinutes[subject] = 0;
      }
      subjectMinutes[subject] += record.studyMinutes || 0;
    });
    
    const colors = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16'];
    
    const data = Object.entries(subjectMinutes)
      .map(([subject, minutes], index) => ({
        subject,
        hours: Math.round((minutes / 60) * 10) / 10,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // トップ10科目
    
    setSubjectData(data);
  };

  // タイムラインデータ生成
  const generateTimelineData = (records: StudyRecord[], userMap: Map<string, any>) => {
    const timelineItems: TimelineItem[] = [];
    
    // 最新100件の学習記録をタイムラインに追加
    records.slice(0, 100).forEach(record => {
      const userData = userMap.get(record.userId);
      const userName = userData?.displayName || 'ユーザー';
      
      timelineItems.push({
        id: `study_${record.id}`,
        type: 'study_record',
        userName,
        userId: record.userId,
        timestamp: record.createdAt,
        subject: record.subject,
        content: record.content,
        details: record.details,
        studyTime: record.studyMinutes || 0,
        icon: '📚',
        color: 'bg-green-100 border-green-300 text-green-800'
      });
    });
    
    // 時系列順にソート
    const sortedItems = timelineItems.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    setTimelineData(sortedItems);
  };

  // データ更新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
      toast({
        title: "更新完了",
        description: "データを最新の状態に更新しました"
      });
    } catch (error) {
      toast({
        title: "更新エラー",
        description: "データの更新に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // フィルタリング
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = gradeFilter === '全学年' || user.grade === gradeFilter;
      const matchesCourse = courseFilter === '全コース' || 
                           (courseFilter === '文系' && user.course === 'liberal') ||
                           (courseFilter === '理系' && user.course === 'science');
      
      return matchesSearch && matchesGrade && matchesCourse;
    });
  };

  // ユーザー詳細モーダル
  const UserDetailModal = ({ user, onClose }: { user: UserStats | null, onClose: () => void }) => {
    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">{user.userName}の詳細</h2>
              <Badge variant="outline" className="bg-blue-50">
                {user.grade} - {user.course === 'liberal' ? '文系' : '理系'}
              </Badge>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? 'アクティブ' : '非アクティブ'}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>基本情報</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>メールアドレス:</strong> {user.email}</div>
                  <div><strong>登録日:</strong> {user.createdAt.toLocaleDateString('ja-JP')}</div>
                  <div><strong>最終ログイン:</strong> {user.lastActive.toLocaleDateString('ja-JP')}</div>
                  <div><strong>学習ストリーク:</strong> {user.currentStreak}日連続</div>
                </div>
              </CardContent>
            </Card>

            {/* 学習統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{user.totalStudyHours.toFixed(1)}時間</div>
                  <div className="text-sm text-gray-600">総学習時間</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{user.weeklyStudyHours.toFixed(1)}時間</div>
                  <div className="text-sm text-gray-600">今週の学習時間</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{user.averageUnderstanding.toFixed(1)}点</div>
                  <div className="text-sm text-gray-600">平均理解度</div>
                </CardContent>
              </Card>
            </div>

            {/* 復習統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>復習統計</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{user.reviewsCompleted}</div>
                    <div className="text-sm text-gray-600">復習完了数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-indigo-600">{user.reviewRequests}</div>
                    <div className="text-sm text-gray-600">復習問題リクエスト</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>管理ボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredUsers = getFilteredUsers();
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const totalStudyHours = users.reduce((sum, u) => sum + u.totalStudyHours, 0);
  const avgStudyHours = totalUsers > 0 ? totalStudyHours / totalUsers : 0;

  // 期間表示テキストの取得
  const getPeriodDisplayText = (period: string) => {
    return period === '7days' ? '直近7日間' : '直近1か月';
  };

  // X軸のフォーマット関数
  const formatXAxisTick = (date: string, period: string) => {
    if (period === '7days') {
      return date;
    } else {
      // 30日間の場合は週単位で表示を間引く
      const dayIndex = chartData.findIndex(d => d.date === date);
      return dayIndex % 5 === 0 ? date : '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                更新
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                エクスポート
              </Button>
              <Badge variant="default" className="bg-red-600">
                <Shield className="w-4 h-4 mr-1" />
                管理者モード
              </Badge>
            </div>
          </div>
          
          {/* 統計サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
                <div className="text-sm text-gray-600">総ユーザー数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
                <div className="text-sm text-gray-600">アクティブユーザー</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{totalStudyHours.toFixed(1)}h</div>
                <div className="text-sm text-gray-600">総学習時間</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{avgStudyHours.toFixed(1)}h</div>
                <div className="text-sm text-gray-600">平均学習時間</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* タブナビゲーション */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="overview" className="text-sm">
              概要・ユーザー管理
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm">
              学習分析
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-sm">
              復習問題管理
            </TabsTrigger>
            <TabsTrigger value="system" className="text-sm">
              システム管理
            </TabsTrigger>
          </TabsList>

          {/* 概要・ユーザー管理タブ */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* 検索・フィルタ */}
            <Card>
              <CardHeader>
                <CardTitle>ユーザー検索・フィルタ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="名前・メールで検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="全学年">全学年</SelectItem>
                      <SelectItem value="1学年">1学年</SelectItem>
                      <SelectItem value="2学年">2学年</SelectItem>
                      <SelectItem value="3学年">3学年</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="全コース">全コース</SelectItem>
                      <SelectItem value="文系">文系</SelectItem>
                      <SelectItem value="理系">理系</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery('');
                    setGradeFilter('全学年');
                    setCourseFilter('全コース');
                  }}>
                    <Filter className="w-4 h-4 mr-2" />
                    リセット
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ユーザー一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>ユーザー一覧</span>
                  <Badge variant="outline">{filteredUsers.length}件</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{user.userName}</span>
                            <Badge variant="outline" className="text-xs">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              {user.grade}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {user.course === 'liberal' ? '📚 文系' : '🔬 理系'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-blue-600">{user.totalStudyHours.toFixed(1)}h</div>
                          <div className="text-gray-500">総学習</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">{user.weeklyStudyHours.toFixed(1)}h</div>
                          <div className="text-gray-500">今週</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-orange-600">{user.averageUnderstanding.toFixed(1)}</div>
                          <div className="text-gray-500">理解度</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-purple-600">{user.currentStreak}</div>
                          <div className="text-gray-500">連続日</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学習分析タブ */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 学年別学習時間 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>学年別学習時間</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { 
                          grade: '1学年', 
                          hours: users.filter(u => u.grade === '1学年')
                            .reduce((sum, u) => sum + u.totalStudyHours, 0) / 
                            Math.max(users.filter(u => u.grade === '1学年').length, 1)
                        },
                        { 
                          grade: '2学年', 
                          hours: users.filter(u => u.grade === '2学年')
                            .reduce((sum, u) => sum + u.totalStudyHours, 0) / 
                            Math.max(users.filter(u => u.grade === '2学年').length, 1)
                        },
                        { 
                          grade: '3学年', 
                          hours: users.filter(u => u.grade === '3学年')
                            .reduce((sum, u) => sum + u.totalStudyHours, 0) / 
                            Math.max(users.filter(u => u.grade === '3学年').length, 1)
                        },
                        { 
                          grade: 'その他', 
                          hours: users.filter(u => u.grade === 'その他')
                            .reduce((sum, u) => sum + u.totalStudyHours, 0) / 
                            Math.max(users.filter(u => u.grade === 'その他').length, 1)
                        }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}時間`, '平均学習時間']} />
                        <Bar dataKey="hours" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 科目別分布 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>科目別学習分布</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectData}
                          dataKey="hours"
                          nameKey="subject"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ subject, hours }) => `${subject} ${hours}h`}
                        >
                          {subjectData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}時間`, '学習時間']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 学習トレンド */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>全体学習トレンド（{getPeriodDisplayText(studyPeriod)}）</span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={studyPeriod === '7days' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setStudyPeriod('7days');
                          generateChartData(studyRecords);
                        }}
                      >
                        7日間
                      </Button>
                      <Button
                        variant={studyPeriod === '30days' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setStudyPeriod('30days');
                          generateChartData(studyRecords);
                        }}
                      >
                        1か月
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date"
                          tickFormatter={(date) => formatXAxisTick(date, studyPeriod)}
                          interval={studyPeriod === '30days' ? 4 : 0}
                        />
                        <YAxis label={{ value: '時間', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          labelFormatter={(label) => {
                            const data = chartData.find(d => d.date === label);
                            return data ? data.dateLabel : label;
                          }}
                          formatter={(value) => [`${Number(value).toFixed(1)}時間`, '全体学習時間']}
                        />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* 期間統計サマリー */}
                  <div className="mt-4 grid grid-cols-4 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {chartData.reduce((sum, day) => sum + day.value, 0).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">{studyPeriod === '7days' ? '7日' : '30日'}合計</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {chartData.length > 0 ? (chartData.reduce((sum, day) => sum + day.value, 0) / chartData.length).toFixed(1) : '0.0'}h
                      </div>
                      <div className="text-xs text-gray-500">日平均</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {chartData.length > 0 ? Math.max(...chartData.map(d => d.value)).toFixed(1) : '0.0'}h
                      </div>
                      <div className="text-xs text-gray-500">最高記録</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {chartData.filter(d => d.value > 0).length}
                      </div>
                      <div className="text-xs text-gray-500">学習日数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 復習問題管理タブ */}
          <TabsContent value="reviews" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>復習問題リクエスト</span>
                  </div>
                  <Button onClick={() => router.push('/admin/review-requests')}>
                    詳細管理画面へ
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-500' :
                          request.status === 'in_progress' ? 'bg-blue-500' :
                          request.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{request.userName}</span>
                            <Badge variant="outline" className="text-xs">{request.subject}</Badge>
                            <Badge variant={
                              request.status === 'pending' ? 'default' :
                              request.status === 'in_progress' ? 'default' : 
                              request.status === 'completed' ? 'default' : 'destructive'
                            } className="text-xs">
                              {request.status === 'pending' ? '受付中' :
                               request.status === 'in_progress' ? '作業中' :
                               request.status === 'completed' ? '完了' : '却下'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">{request.unit}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {request.createdAt.toLocaleDateString('ja-JP')}
                        </span>
                        {request.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {request.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-500" />}
                        {request.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {request.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 復習統計 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {reviewRequests.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">待機中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {reviewRequests.filter(r => r.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-gray-600">作業中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reviewRequests.filter(r => r.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">完了</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {reviewRequests.filter(r => r.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-600">却下</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* システム管理タブ */}
          <TabsContent value="system" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* システム状態 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>システム状態</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">データベース</span>
                      <Badge variant="default" className="bg-green-600">正常</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">認証システム</span>
                      <Badge variant="default" className="bg-green-600">正常</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ストレージ</span>
                      <Badge variant="default" className="bg-green-600">正常</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">バックアップ</span>
                      <Badge variant="secondary">最終: 昨日 23:00</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* データ管理 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>データ管理</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      全ユーザーデータエクスポート
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      学習記録一括エクスポート
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={async () => {
                      try {
                        await ReviewStatsService.updateAllUsersReviewStats();
                        toast({
                          title: "更新完了",
                          description: "全ユーザーの復習統計を再計算しました"
                        });
                      } catch (error) {
                        toast({
                          title: "エラー",
                          description: "復習統計の再計算に失敗しました",
                          variant: "destructive"
                        });
                      }
                    }}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      復習統計再計算
                    </Button>
                    <Button variant="destructive" className="w-full justify-start">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      システムメンテナンス
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* アクティビティログ */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>最近のアクティビティ</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {timelineData.slice(0, 10).map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-500">{item.timestamp.toLocaleString('ja-JP')}</span>
                        <span>{item.userName}が{item.subject}の学習記録を追加しました</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ユーザー詳細モーダル */}
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      </div>
    </div>
  );
}