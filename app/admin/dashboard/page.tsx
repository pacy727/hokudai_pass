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

// ダミーデータ（実際の実装では Firebase から取得）
const mockUsers = [
  {
    id: 'user1',
    displayName: '田中太郎',
    email: 'tanaka@obihiro-ohtani.ed.jp',
    grade: '3学年',
    course: 'science',
    createdAt: new Date('2024-01-15'),
    lastActive: new Date('2024-08-20'),
    totalStudyHours: 245.5,
    weeklyStudyHours: 12.3,
    reviewsCompleted: 45,
    averageUnderstanding: 78.5,
    reviewRequests: 8,
    currentStreak: 7,
    isActive: true
  },
  {
    id: 'user2',
    displayName: '佐藤花子',
    email: 'sato@obihiro-ohtani.ed.jp',
    grade: '3学年',
    course: 'liberal',
    createdAt: new Date('2024-02-01'),
    lastActive: new Date('2024-08-21'),
    totalStudyHours: 198.2,
    weeklyStudyHours: 15.7,
    reviewsCompleted: 32,
    averageUnderstanding: 82.1,
    reviewRequests: 12,
    currentStreak: 3,
    isActive: true
  },
  {
    id: 'user3',
    displayName: '鈴木次郎',
    email: 'suzuki@obihiro-ohtani.ed.jp',
    grade: '2学年',
    course: 'science',
    createdAt: new Date('2024-03-10'),
    lastActive: new Date('2024-08-19'),
    totalStudyHours: 156.8,
    weeklyStudyHours: 8.9,
    reviewsCompleted: 28,
    averageUnderstanding: 65.3,
    reviewRequests: 5,
    currentStreak: 0,
    isActive: false
  },
  {
    id: 'user4',
    displayName: '高橋美咲',
    email: 'takahashi@obihiro-ohtani.ed.jp',
    grade: '1学年',
    course: 'liberal',
    createdAt: new Date('2024-04-05'),
    lastActive: new Date('2024-08-21'),
    totalStudyHours: 89.4,
    weeklyStudyHours: 10.2,
    reviewsCompleted: 15,
    averageUnderstanding: 71.8,
    reviewRequests: 3,
    currentStreak: 2,
    isActive: true
  }
];

const mockStudyCalendarData7Days = [
  { date: '2024-08-15', value: 2.5 },
  { date: '2024-08-16', value: 3.2 },
  { date: '2024-08-17', value: 1.8 },
  { date: '2024-08-18', value: 4.1 },
  { date: '2024-08-19', value: 2.9 },
  { date: '2024-08-20', value: 3.7 },
  { date: '2024-08-21', value: 2.3 }
];

const mockStudyCalendarData30Days = [
  { date: '2024-07-23', value: 1.8 }, { date: '2024-07-24', value: 2.4 },
  { date: '2024-07-25', value: 3.1 }, { date: '2024-07-26', value: 2.2 },
  { date: '2024-07-27', value: 1.9 }, { date: '2024-07-28', value: 0.0 },
  { date: '2024-07-29', value: 3.8 }, { date: '2024-07-30', value: 4.2 },
  { date: '2024-07-31', value: 2.7 }, { date: '2024-08-01', value: 3.5 },
  { date: '2024-08-02', value: 2.1 }, { date: '2024-08-03', value: 1.4 },
  { date: '2024-08-04', value: 0.0 }, { date: '2024-08-05', value: 2.8 },
  { date: '2024-08-06', value: 3.9 }, { date: '2024-08-07', value: 2.6 },
  { date: '2024-08-08', value: 4.3 }, { date: '2024-08-09', value: 1.7 },
  { date: '2024-08-10', value: 2.9 }, { date: '2024-08-11', value: 0.0 },
  { date: '2024-08-12', value: 3.4 }, { date: '2024-08-13', value: 2.8 },
  { date: '2024-08-14', value: 4.1 }, { date: '2024-08-15', value: 2.5 },
  { date: '2024-08-16', value: 3.2 }, { date: '2024-08-17', value: 1.8 },
  { date: '2024-08-18', value: 4.1 }, { date: '2024-08-19', value: 2.9 },
  { date: '2024-08-20', value: 3.7 }, { date: '2024-08-21', value: 2.3 }
];

const mockSubjectData = [
  { subject: '数学', hours: 45.2, color: '#3b82f6' },
  { subject: '英語', hours: 38.7, color: '#10b981' },
  { subject: '国語', hours: 32.1, color: '#ef4444' },
  { subject: '理科1', hours: 29.8, color: '#8b5cf6' },
  { subject: '社会', hours: 24.5, color: '#f59e0b' }
];

const mockReviewRequests = [
  {
    id: 'req1',
    userName: '田中太郎',
    subject: '数学',
    unit: '二次関数',
    status: 'pending',
    createdAt: new Date('2024-08-20'),
    urgency: 'high'
  },
  {
    id: 'req2',
    userName: '佐藤花子',
    subject: '英語',
    unit: '関係代名詞',
    status: 'in_progress',
    createdAt: new Date('2024-08-19'),
    urgency: 'medium'
  },
  {
    id: 'req3',
    userName: '鈴木次郎',
    subject: '理科1',
    unit: '化学反応',
    status: 'completed',
    createdAt: new Date('2024-08-18'),
    urgency: 'low'
  }
];

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('全学年');
  const [courseFilter, setCourseFilter] = useState('全コース');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studyPeriod, setStudyPeriod] = useState('7days'); // 新規追加
  const [userDetailPeriod, setUserDetailPeriod] = useState('7days'); // ユーザー詳細モーダル用

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  // 学習期間データの取得
  const getStudyCalendarData = (period: string) => {
    return period === '7days' ? mockStudyCalendarData7Days : mockStudyCalendarData30Days;
  };

  // 期間表示テキストの取得
  const getPeriodDisplayText = (period: string) => {
    return period === '7days' ? '直近7日間' : '直近1か月';
  };

  // X軸のフォーマット関数
  const formatXAxisTick = (date: string, period: string) => {
    const dateObj = new Date(date);
    if (period === '7days') {
      return dateObj.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } else {
      // 30日間の場合は週単位で表示を間引く
      return dateObj.getDate() % 5 === 0 ? 
        dateObj.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '';
    }
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 実際の実装では Firebase からデータを再取得
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // フィルタリング
  const getFilteredUsers = () => {
    return mockUsers.filter(user => {
      const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = gradeFilter === '全学年' || user.grade === gradeFilter;
      const matchesCourse = courseFilter === '全コース' || 
                           (courseFilter === '文系' && user.course === 'liberal') ||
                           (courseFilter === '理系' && user.course === 'science');
      
      return matchesSearch && matchesGrade && matchesCourse;
    });
  };

  // ユーザー詳細表示
  const UserDetailModal = ({ user, onClose }: { user: any, onClose: () => void }) => {
    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">{user.displayName}の詳細</h2>
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
                  <div className="text-2xl font-bold text-blue-600">{user.totalStudyHours}時間</div>
                  <div className="text-sm text-gray-600">総学習時間</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{user.weeklyStudyHours}時間</div>
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

            {/* 学習カレンダー */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>{getPeriodDisplayText(userDetailPeriod)}の学習時間</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={userDetailPeriod === '7days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUserDetailPeriod('7days')}
                    >
                      7日間
                    </Button>
                    <Button
                      variant={userDetailPeriod === '30days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUserDetailPeriod('30days')}
                    >
                      1か月
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getStudyCalendarData(userDetailPeriod)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => formatXAxisTick(date, userDetailPeriod)}
                        interval={userDetailPeriod === '30days' ? 4 : 0}
                      />
                      <YAxis label={{ value: '時間', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                        formatter={(value) => [`${value}時間`, '学習時間']}
                      />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 期間統計サマリー */}
                <div className="mt-4 grid grid-cols-3 gap-4 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {getStudyCalendarData(userDetailPeriod).reduce((sum, day) => sum + day.value, 0).toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-500">総学習時間</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {(getStudyCalendarData(userDetailPeriod).reduce((sum, day) => sum + day.value, 0) / 
                        getStudyCalendarData(userDetailPeriod).length).toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-500">日平均</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {Math.max(...getStudyCalendarData(userDetailPeriod).map(d => d.value)).toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-500">最高記録</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 科目別学習時間 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>科目別学習時間</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockSubjectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis label={{ value: '時間', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => [`${value}時間`, '学習時間']} />
                      <Bar dataKey="hours" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredUsers = getFilteredUsers();
  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter(u => u.isActive).length;
  const totalStudyHours = mockUsers.reduce((sum, u) => sum + u.totalStudyHours, 0);
  const avgStudyHours = totalStudyHours / totalUsers;

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
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => setSelectedUser(user as any)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{user.displayName}</span>
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
                          <div className="font-medium text-blue-600">{user.totalStudyHours}h</div>
                          <div className="text-gray-500">総学習</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">{user.weeklyStudyHours}h</div>
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
                        { grade: '1学年', hours: 89.4 },
                        { grade: '2学年', hours: 156.8 },
                        { grade: '3学年', hours: 221.9 }
                      ]}>
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
                          data={mockSubjectData}
                          dataKey="hours"
                          nameKey="subject"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ subject, percent }) => `${subject} ${(percent * 100).toFixed(0)}%`}
                        >
                          {mockSubjectData.map((entry, index) => (
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
                        onClick={() => setStudyPeriod('7days')}
                      >
                        7日間
                      </Button>
                      <Button
                        variant={studyPeriod === '30days' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStudyPeriod('30days')}
                      >
                        1か月
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getStudyCalendarData(studyPeriod)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date"
                          tickFormatter={(date) => formatXAxisTick(date, studyPeriod)}
                          interval={studyPeriod === '30days' ? 4 : 0}
                        />
                        <YAxis label={{ value: '時間', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          labelFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                          formatter={(value) => [`${value}時間`, '全体学習時間']}
                        />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* 期間統計サマリー */}
                  <div className="mt-4 grid grid-cols-4 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {getStudyCalendarData(studyPeriod).reduce((sum, day) => sum + day.value, 0).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">{studyPeriod === '7days' ? '7日' : '30日'}合計</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {(getStudyCalendarData(studyPeriod).reduce((sum, day) => sum + day.value, 0) / 
                          getStudyCalendarData(studyPeriod).length).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">日平均</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {Math.max(...getStudyCalendarData(studyPeriod).map(d => d.value)).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">最高記録</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {getStudyCalendarData(studyPeriod).filter(d => d.value > 0).length}
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
                  {mockReviewRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-500' :
                          request.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{request.userName}</span>
                            <Badge variant="outline" className="text-xs">{request.subject}</Badge>
                            <Badge variant={
                              request.urgency === 'high' ? 'destructive' :
                              request.urgency === 'medium' ? 'default' : 'secondary'
                            } className="text-xs">
                              {request.urgency === 'high' ? '緊急' :
                               request.urgency === 'medium' ? '普通' : '低'}
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
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 復習統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {mockReviewRequests.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">待機中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {mockReviewRequests.filter(r => r.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-gray-600">作業中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {mockReviewRequests.filter(r => r.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">完了</div>
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
                    <Button variant="outline" className="w-full justify-start">
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
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-500">2024/08/21 14:30</span>
                      <span>田中太郎が学習記録を追加しました</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-500">2024/08/21 14:15</span>
                      <span>佐藤花子が復習問題をリクエストしました</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-500">2024/08/21 13:45</span>
                      <span>鈴木次郎がログインしました</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-500">2024/08/21 13:30</span>
                      <span>高橋美咲が復習を完了しました</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-500">2024/08/21 12:00</span>
                      <span>システムバックアップが完了しました</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 警告・アラート */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span>警告・アラート</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-yellow-800">
                          長期間非アクティブなユーザー
                        </div>
                        <div className="text-sm text-yellow-700 mt-1">
                          鈴木次郎さんが2日間ログインしていません
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        確認
                      </Button>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-red-800">
                          復習問題リクエスト滞留
                        </div>
                        <div className="text-sm text-red-700 mt-1">
                          3件の復習問題リクエストが24時間以上未処理です
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        対応
                      </Button>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-blue-800">
                          システム正常稼働中
                        </div>
                        <div className="text-sm text-blue-700 mt-1">
                          全てのサービスが正常に動作しています
                        </div>
                      </div>
                    </div>
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