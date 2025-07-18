"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ReviewItem, StudyLog, StudyProgress, TodayTask, ReviewStage } from '@/types/review';
import { Subject } from '@/types/study';
import { ReviewService } from '@/lib/db/reviewService';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { ReviewWorkflow } from '@/components/ReviewWorkflow';
import { UnderstandingInputModal } from '@/components/UnderstandingInputModal';
import { TodayTasks } from '@/components/TodayTasks';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeReviewItems, setActiveReviewItems] = useState<ReviewItem[]>([]);
  const [completedReviewItems, setCompletedReviewItems] = useState<ReviewItem[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>([]);
  
  // モーダル状態
  const [selectedReviewItem, setSelectedReviewItem] = useState<ReviewItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<ReviewStage | null>(null);
  const [isUnderstandingModalOpen, setIsUnderstandingModalOpen] = useState(false);
  
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setIsDataLoading(true);
    try {
      const availableSubjects = getAvailableSubjects();
      
      console.log('🔍 Loading data for user:', user.uid);
      console.log('📋 Available subjects:', availableSubjects);
      
      // 各データを個別に取得してエラーを特定
      console.log('🚀 Starting to fetch review items...');
      const allReviews = await ReviewService.getReviewItems(user.uid);
      console.log('✅ Review items fetched:', allReviews.length);
      
      console.log('🚀 Starting to fetch study records...');
      const studyRecords = await StudyRecordService.getRecordsByUser(user.uid);
      console.log('✅ Study records fetched:', studyRecords.length);
      console.log('🎯 Records with shouldReview:', studyRecords.filter(r => r.shouldReview).length);
      
      console.log('🚀 Starting to fetch today tasks...');
      const todayTasksData = await ReviewService.getTodayTasks(user.uid);
      console.log('✅ Today tasks fetched:', todayTasksData.length);
      
      console.log('🚀 Starting to fetch progress data...');
      const progress = await ReviewService.getStudyProgress(user.uid, availableSubjects);
      console.log('✅ Progress data fetched:', progress.length);

      console.log('📊 Data summary:');
      console.log('- Review items:', allReviews.length);
      console.log('- Study records:', studyRecords.length);
      console.log('- Records with shouldReview:', studyRecords.filter(r => r.shouldReview).length);
      console.log('- Today tasks:', todayTasksData.length);

      // 復習アイテムを完了/進行中に分類
      const active = allReviews.filter(item => !item.isCompleted);
      const completed = allReviews.filter(item => item.isCompleted);

      console.log('📋 Review items classified:');
      console.log('- Active items:', active.length);
      console.log('- Completed items:', completed.length);

      // 復習リスト登録された学習記録から学習ログを生成
      const reviewStudyRecords = studyRecords.filter(record => record.shouldReview);
      const generatedStudyLogs = reviewStudyRecords.map(record => ({
        id: record.id,
        userId: record.userId,
        subject: record.subject,
        unit: record.content,
        content: record.details || record.content,
        studyType: 'practice' as const,
        duration: record.studyHours * 60,
        understanding: 'good' as const,
        notes: record.memo,
        studyDate: new Date(record.studyDate),
        createdAt: record.createdAt
      }));

      console.log('📝 Generated study logs:', generatedStudyLogs.length);

      setReviewItems(allReviews);
      setActiveReviewItems(active);
      setCompletedReviewItems(completed);
      setTodayTasks(todayTasksData);
      setStudyLogs(generatedStudyLogs);
      setStudyProgress(progress);

      console.log('✅ All data loaded and state updated successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 利用可能科目の取得
  const getAvailableSubjects = (): Subject[] => {
    if (!user) return [];
    
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

  // 復習ステージ選択処理
  const handleStageSelect = (reviewItem: ReviewItem, stage: ReviewStage) => {
    setSelectedReviewItem(reviewItem);
    setSelectedStage(stage);
    setIsUnderstandingModalOpen(true);
  };

  // タスク選択処理
  const handleTaskSelect = (task: TodayTask) => {
    handleStageSelect(task.reviewItem, task.stage);
  };

  // 理解度送信処理
  const handleUnderstandingSubmit = async (understanding: number) => {
    console.log('Understanding submitted:', understanding);
    // データを再読み込み
    await loadData();
  };

  // 学習ログのグループ化
  const groupStudyLogsBySubject = (logs: StudyLog[]) => {
    const grouped: Record<Subject, StudyLog[]> = {} as Record<Subject, StudyLog[]>;
    
    logs.forEach(log => {
      if (!grouped[log.subject]) {
        grouped[log.subject] = [];
      }
      grouped[log.subject].push(log);
    });
    
    return grouped;
  };

  // 理解度の表示名
  const getUnderstandingLabel = (understanding: string) => {
    switch (understanding) {
      case 'excellent': return '優秀';
      case 'good': return '良好';
      case 'fair': return '普通';
      case 'poor': return '要改善';
      default: return '不明';
    }
  };

  // 理解度の色を取得
  const getUnderstandingColor = (understanding: string) => {
    switch (understanding) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 時間のフォーマット
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  if (isLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const groupedStudyLogs = groupStudyLogsBySubject(studyLogs);
  const availableSubjects = getAvailableSubjects();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">学習カルテ</h1>
          <p className="text-gray-600">復習の進捗を管理して、効率的な学習を進めましょう</p>
        </div>

        <Tabs defaultValue="review" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="review">復習管理</TabsTrigger>
            <TabsTrigger value="completed">復習完了</TabsTrigger>
            <TabsTrigger value="logs">学習ログ</TabsTrigger>
            <TabsTrigger value="progress">進捗分析</TabsTrigger>
          </TabsList>

          {/* 復習管理タブ（本日のタスク + 復習リスト統合） */}
          <TabsContent value="review" className="space-y-6">
            {/* 本日のタスク */}
            <TodayTasks
              tasks={todayTasks}
              onTaskSelect={handleTaskSelect}
              getSubjectDisplayName={getSubjectDisplayName}
            />

            {/* 復習リスト */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>復習リスト</span>
                  <Badge variant="outline" className="ml-2">
                    {activeReviewItems.length}件
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  学習記録で「復習リスト登録」をチェックした内容の復習ワークフロー
                </p>
              </CardHeader>
              <CardContent>
                {activeReviewItems.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">復習項目がありません</p>
                    <p className="text-sm text-gray-400 mb-4">
                      学習記録を保存する際に「復習リスト登録」をチェックすると、自動で復習リストに追加されます
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/record')}
                      className="mt-2"
                    >
                      学習記録を入力する
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeReviewItems.map((item) => (
                      <ReviewWorkflow
                        key={item.id}
                        reviewItem={item}
                        onStageSelect={handleStageSelect}
                        getSubjectDisplayName={getSubjectDisplayName}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 復習完了タブ */}
          <TabsContent value="completed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <span>復習完了リスト</span>
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                    {completedReviewItems.length}件完了
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  全ての復習段階を完了した項目一覧
                </p>
              </CardHeader>
              <CardContent>
                {completedReviewItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">完了した復習項目がありません</p>
                    <p className="text-sm text-gray-400">
                      復習を完了すると、ここに表示されます
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedReviewItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border rounded-lg bg-green-50 border-green-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">
                                {getSubjectDisplayName(item.subject)}
                              </Badge>
                              <Badge variant="default" className="bg-green-600">
                                復習完了
                              </Badge>
                              <span className="text-sm text-gray-500">
                                完了日: {item.updatedAt.toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{item.unit}</h3>
                            <p className="text-gray-600 mb-2">{item.content}</p>
                            
                            {/* 復習履歴 */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {item.progress.map((p) => (
                                <div key={p.stage} className="flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  <span>第{p.stage}回: {p.understanding}点</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学習ログタブ */}
          <TabsContent value="logs" className="space-y-6">
            {availableSubjects.map((subject) => {
              const subjectLogs = groupedStudyLogs[subject] || [];
              if (subjectLogs.length === 0) return null;

              return (
                <Card key={subject}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>{getSubjectDisplayName(subject)}</span>
                      <Badge variant="outline">{subjectLogs.length}件</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {subjectLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 border rounded-lg bg-white"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{log.unit}</Badge>
                              <Badge 
                                variant="outline"
                                className={getUnderstandingColor(log.understanding)}
                              >
                                {getUnderstandingLabel(log.understanding)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime(log.duration)}</span>
                              <span>•</span>
                              <span>{log.studyDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                          <h4 className="font-medium mb-1">{log.content}</h4>
                          {log.notes && (
                            <p className="text-sm text-gray-600">{log.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* 進捗分析タブ */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studyProgress.map((progress) => (
                <Card key={progress.subject}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>{getSubjectDisplayName(progress.subject)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 単元進捗 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">単元進捗</span>
                        <span className="text-sm text-gray-500">
                          {progress.completedUnits}/{progress.totalUnits}
                        </span>
                      </div>
                      <Progress 
                        value={progress.totalUnits > 0 ? (progress.completedUnits / progress.totalUnits) * 100 : 0}
                        className="h-2"
                      />
                    </div>

                    {/* 復習状況 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">未完了復習</span>
                        <span className="text-sm font-medium">{progress.pendingReviews}件</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">期限切れ復習</span>
                        <span className="text-sm font-medium text-red-600">{progress.overdueReviews}件</span>
                      </div>
                    </div>

                    {/* 理解度 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">平均理解度</span>
                        <span className="text-sm text-gray-500">
                          {progress.averageUnderstanding.toFixed(1)}/4.0
                        </span>
                      </div>
                      <Progress 
                        value={(progress.averageUnderstanding / 4) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* 学習時間 */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">総学習時間</span>
                        <span className="text-sm font-medium">{formatTime(progress.totalStudyTime)}</span>
                      </div>
                      {progress.lastStudyDate && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">最終学習</span>
                          <span className="text-sm text-gray-500">
                            {progress.lastStudyDate.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 理解度入力モーダル */}
      {selectedReviewItem && selectedStage && (
        <UnderstandingInputModal
          reviewItem={selectedReviewItem}
          stage={selectedStage}
          isOpen={isUnderstandingModalOpen}
          onClose={() => {
            setIsUnderstandingModalOpen(false);
            setSelectedReviewItem(null);
            setSelectedStage(null);
          }}
          onSubmit={handleUnderstandingSubmit}
        />
      )}
    </div>
  );
}