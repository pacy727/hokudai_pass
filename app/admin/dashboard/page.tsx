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
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, collections } from '@/lib/firebase';
import { StudyRecord } from '@/types/study';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { ReviewQuestionRequest } from '@/types/review';

// ユーザー統計データの型定義
interface UserStats {
  userId: string;
  userName: string;
  email?: string;
  grade?: string;
  course?: string;
  createdAt?: Date;
  lastActive?: Date;
  totalHours: number;
  weeklyHours: number;
  reviewsCompleted: number;
  averageUnderstanding: number;
  reviewRequests: number;
  currentStreak: number;
  isActive: boolean;
}

// チャートデータの型定義
interface ChartDataPoint {
  date: string;
  value: number;
  dateLabel: string;
}

// 科目データの型定義
interface SubjectData {
  subject: string;
  hours: number;
  color: string;
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // State管理
  const [currentTab, setCurrentTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('全学年');
  const [courseFilter, setCourseFilter] = useState('全コース');
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studyPeriod, setStudyPeriod] = useState('7days');
  const [userDetailPeriod, setUserDetailPeriod] = useState('7days');
  
  // データState
  const [users, setUsers] = useState<UserStats[]>([]);
  const [studyCalendarData, setStudyCalendarData] = useState<ChartDataPoint[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewQuestionRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
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

  // 全データ読み込み
  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      console.log('🔄 Loading admin dashboard data...');
      
      await Promise.all([
        loadUsers(),
        loadStudyData(),
        loadReviewRequests(),
        loadActivityLogs()
      ]);
      
      console.log('✅ All admin data loaded');
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // ユーザーデータ読み込み
  const loadUsers = async () => {
    try {
      console.log('👥 Loading users data...');
      
      // 全ユーザーを取得
      const usersSnapshot = await getDocs(collection(db, collections.users));
      console.log('📄 Total users found:', usersSnapshot.docs.length);
      
      const userPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // 最近30日間の学習記録を取得
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        const studyRecordsQuery = query(
          collection(db, collections.studyRecords),
          where('userId', '==', userId),
          where('studyDate', '>=', thirtyDaysAgoStr)
        );
        
        const studySnapshot = await getDocs(studyRecordsQuery);
        const studyRecords = studySnapshot.docs.map(doc => ({
          ...doc.data(),
          studyMinutes: doc.data().studyMinutes || (doc.data().studyHours ? doc.data().studyHours * 60 : 0)
        }));
        
        // 今週の学習記録を取得（月曜日開始）
        const now = new Date();
        const currentDay = now.getDay();
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
        const weekStartDate = new Date(now.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
        weekStartDate.setHours(0, 0, 0, 0);
        const weekStartStr = weekStartDate.toISOString().split('T')[0];
        
        const weeklyRecords = studyRecords.filter(record => 
          record.studyDate >= weekStartStr
        );
        
        // 統計計算
        const totalMinutes = studyRecords.reduce((sum, record) => sum + record.studyMinutes, 0);
        const weeklyMinutes = weeklyRecords.reduce((sum, record) => sum + record.studyMinutes, 0);
        
        // 復習統計（簡易版）
        const reviewStats = userData.reviewStats || {
          totalReviewsCompleted: 0,
          averageUnderstanding: 0
        };
        
        // アクティブ判定（過去7日以内に学習記録があるか）
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const recentRecords = studyRecords.filter(record => record.studyDate >= sevenDaysAgoStr);
        const isActive = recentRecords.length > 0;
        
        // 学習ストリーク計算（簡易版）
        const today = new Date().toISOString().split('T')[0];
        let currentStreak = 0;
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - i);
          const checkDateStr = checkDate.toISOString().split('T')[0];
          
          const hasStudy = studyRecords.some(record => 
            record.studyDate === checkDateStr && record.studyMinutes >= 30
          );
          
          if (hasStudy) {
            currentStreak++;
          } else if (i > 0) {
            break;
          }
        }
        
        return {
          userId,
          userName: userData.displayName || 'ユーザー',
          email: userData.email || '',
          grade: userData.grade || 'その他',
          course: userData.course || 'science',
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastActive: new Date(), // 最終アクティブ時刻は簡略化
          totalHours: totalMinutes / 60,
          weeklyHours: weeklyMinutes / 60,
          reviewsCompleted: reviewStats.totalReviewsCompleted,
          averageUnderstanding: reviewStats.averageUnderstanding,
          reviewRequests: 0, // 後で設定
          currentStreak,
          isActive
        } as UserStats;
      });
      
      const usersData = await Promise.all(userPromises);
      setUsers(usersData);
      console.log('✅ Users data loaded:', usersData.length);
      
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setUsers([]);
    }
  };

  // 学習データ読み込み
  const loadStudyData = async () => {
    try {
      console.log('📊 Loading study data...');
      
      // 指定期間の学習記録を取得
      const daysToLoad = studyPeriod === '7days' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const studyQuery = query(
        collection(db, collections.studyRecords),
        where('studyDate', '>=', startDateStr),
        orderBy('studyDate', 'desc')
      );
      
      const studySnapshot = await getDocs(studyQuery);
      console.log('📄 Study records found:', studySnapshot.docs.length);
      
      const records = studySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0)
        };
      });
      
      // 日付ごとの学習時間を集計
      const studyByDate: Record<string, number> = {};
      const subjectHours: Record<string, number> = {};
      
      records.forEach(record => {
        const date = record.studyDate;
        const minutes = record.studyMinutes || 0;
        const subject = record.subject || '不明';
        
        studyByDate[date] = (studyByDate[date] || 0) + minutes;
        subjectHours[subject] = (subjectHours[subject] || 0) + (minutes / 60);
      });
      
      // チャートデータ生成
      const chartData: ChartDataPoint[] = [];
      for (let i = daysToLoad - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dayOfWeek = dayNames[date.getDay()];
        const shortDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        chartData.push({
          date: shortDate,
          value: studyByDate[dateStr] || 0,
          dateLabel: `${shortDate}(${dayOfWeek})`
        });
      }
      
      setStudyCalendarData(chartData);
      
      // 科目別データ生成
      const subjectColors = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];
      const subjectDataArray = Object.entries(subjectHours)
        .map(([subject, hours], index) => ({
          subject,
          hours: Math.round(hours * 10) / 10,
          color: subjectColors[index % subjectColors.length]
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);
      
      setSubjectData(subjectDataArray);
      console.log('✅ Study data loaded');
      
    } catch (error) {
      console.error('❌ Error loading study data:', error);
      setStudyCalendarData([]);
      setSubjectData([]);
    }
  };

  // 復習問題リクエスト読み込み
  const loadReviewRequests = async () => {
    try {
      console.log('📝 Loading review requests...');
      const requests = await ReviewQuestionRequestService.getAllRequests();
      setReviewRequests(requests.slice(0, 10)); // 最新10件
      console.log('✅ Review requests loaded:', requests.length);
    } catch (error) {
      console.error('❌ Error loading review requests:', error);
      setReviewRequests([]);
    }
  };

  // アクティビティログ読み込み
  const loadActivityLogs = async () => {
    try {
      console.log('📋 Loading activity logs...');
      
      // 最新の学習記録を取得（アクティビティログとして使用）
      const recentStudyQuery = query(
        collection(db, collections.studyRecords),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const studySnapshot = await getDocs(recentStudyQuery);
      const userNamesMap = new Map<string, string>();
      
      // ユーザー名マップを作成
      const usersSnapshot = await getDocs(collection(db, collections.users));
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        userNamesMap.set(doc.id, userData.displayName || 'ユーザー');
      });
      
      const logs = studySnapshot.docs.map(doc => {
        const data = doc.data();
        const userName = userNamesMap.get(data.userId) || 'ユーザー';
        
        return {
          id: doc.id,
          type: 'study_record',
          userName,
          message: `${data.subject}を${Math.round((data.studyMinutes || 0) / 60 * 10) / 10}時間学習しました`,
          timestamp: data.createdAt?.toDate() || new Date(),
          color: 'bg-green-100 border-green-300 text-green-800'
        };
      });
      
      setActivityLogs(logs);
      console.log('✅ Activity logs loaded');
      
    } catch (error) {
      console.error('❌ Error loading activity logs:', error);
      setActivityLogs([]);
    }
  };

  // データ更新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
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

  // 統計計算
  const getStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const totalStudyHours = users.reduce((sum, u) => sum + u.totalHours, 0);
    const avgStudyHours = totalUsers > 0 ? totalStudyHours / totalUsers : 0;

    return {
      total: totalUsers,
      pending: reviewRequests.filter(r => r.status === 'pending').length,
      inProgress: reviewRequests.filter(r => r.status === 'in_progress').length,
      completed: reviewRequests.filter(r => r.status === 'completed').length,
      rejected: reviewRequests.filter(r => r.status === 'rejected').length,
      activeUsers,
      totalStudyHours,
      avgStudyHours
    };
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
                  <div><strong>登録日:</strong> {user.createdAt?.toLocaleDateString('ja-JP')}</div>
                  <div><strong>学習ストリーク:</strong> {user.currentStreak}日連続</div>
                  <div><strong>コース:</strong> {user.course === 'liberal' ? '文系' : '理系'}</div>
                </div>
              </CardContent>
            </Card>

            {/* 学習統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{user.totalHours.toFixed(1)}時間</div>
                  <div className="text-sm text-gray-600">総学習時間（30日）</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{user.weeklyHours.toFixed(1)}時間</div>
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
          <p>管理者データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredUsers = getFilteredUsers();
  const stats = getStats();

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
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">総ユーザー数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <div className="text-sm text-gray-600">アクティブユーザー</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalStudyHours.toFixed(1)}h</div>
                <div className="text-sm text-gray-600">総学習時間（30日）</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.avgStudyHours.toFixed(1)}h</div>
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
                          <div className="font-medium text-blue-600">{user.totalHours.toFixed(1)}h</div>
                          <div className="text-gray-500">総学習</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">{user.weeklyHours.toFixed(1)}h</div>
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
                      <BarChart data={(() => {
                        const gradeStats = users.reduce((acc, user) => {
                          const grade = user.grade || 'その他';
                          if (!acc[grade]) acc[grade] = { grade, totalHours: 0, count: 0 };
                          acc[grade].totalHours += user.totalHours;
                          acc[grade].count += 1;
                          return acc;
                        }, {} as Record<string, { grade: string, totalHours: number, count: number }>);
                        
                        return Object.values(gradeStats).map(stat => ({
                          grade: stat.grade,
                          hours: stat.count > 0 ? Math.round((stat.totalHours / stat.count) * 10) / 10 : 0
                        }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}時間`, '平均学習時間']} />
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
                          label={({ subject, percent }) => `${subject} ${(percent * 100).toFixed(0)}%`}
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
                      <span>全体学習トレンド（{studyPeriod === '7days' ? '直近7日間' : '直近1か月'}）</span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={studyPeriod === '7days' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setStudyPeriod('7days');
                          loadStudyData();
                        }}
                      >
                        7日間
                      </Button>
                      <Button
                        variant={studyPeriod === '30days' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setStudyPeriod('30days');
                          loadStudyData();
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
                      <LineChart data={studyCalendarData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date"
                          interval={studyPeriod === '30days' ? 4 : 0}
                        />
                        <YAxis label={{ value: '分', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          labelFormatter={(label) => {
                            const data = studyCalendarData.find(d => d.date === label);
                            return data ? data.dateLabel : label;
                          }}
                          formatter={(value) => [`${value}分`, '全体学習時間']}
                        />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* 期間統計サマリー */}
                  <div className="mt-4 grid grid-cols-4 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {Math.round(studyCalendarData.reduce((sum, day) => sum + day.value, 0) / 60)}h
                      </div>
                      <div className="text-xs text-gray-500">{studyPeriod === '7days' ? '7日' : '30日'}合計</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {studyCalendarData.length > 0 ? Math.round(studyCalendarData.reduce((sum, day) => sum + day.value, 0) / studyCalendarData.length) : 0}分
                      </div>
                      <div className="text-xs text-gray-500">日平均</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {studyCalendarData.length > 0 ? Math.max(...studyCalendarData.map(d => d.value)) : 0}分
                      </div>
                      <div className="text-xs text-gray-500">最高記録</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {studyCalendarData.filter(d => d.value > 0).length}
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
                  {reviewRequests.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      復習問題リクエストがありません
                    </div>
                  ) : (
                    reviewRequests.map((request) => (
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
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 復習統計 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </div>
                  <div className="text-sm text-gray-600">受付中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.inProgress}
                  </div>
                  <div className="text-sm text-gray-600">作業中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.completed}
                  </div>
                  <div className="text-sm text-gray-600">完了</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.rejected}
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
                      <span className="text-sm">総ユーザー数</span>
                      <Badge variant="secondary">{stats.total}人</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">アクティブユーザー</span>
                      <Badge variant="secondary">{stats.activeUsers}人</Badge>
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
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      全ユーザーデータエクスポート（開発中）
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      学習記録一括エクスポート（開発中）
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleRefresh}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      データ再読み込み
                    </Button>
                    <Button variant="destructive" className="w-full justify-start" disabled>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      システムメンテナンス（準備中）
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
                    {activityLogs.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        アクティビティがありません
                      </div>
                    ) : (
                      activityLogs.map((log) => (
                        <div key={log.id} className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-500">{log.timestamp.toLocaleString('ja-JP')}</span>
                          <span>{log.userName}が{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 警告・アラート */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-green-500" />
                    <span>システムアラート</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-green-800">
                          システム正常稼働中
                        </div>
                        <div className="text-sm text-green-700 mt-1">
                          全てのサービスが正常に動作しています
                        </div>
                      </div>
                    </div>
                    
                    {stats.pending > 5 && (
                      <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-yellow-800">
                            復習問題リクエスト待機中
                          </div>
                          <div className="text-sm text-yellow-700 mt-1">
                            {stats.pending}件の復習問題リクエストが処理待ちです
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentTab('reviews')}>
                          確認
                        </Button>
                      </div>
                    )}
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