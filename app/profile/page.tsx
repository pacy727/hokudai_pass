"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('review');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
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

  // 時間のフォーマット（四捨五入して〇.〇時間表示）
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.round((minutes / 60) * 10) / 10; // 小数点1桁で四捨五入
    return `${hours}時間`;
  };

  useEffect(() => {
    // URLパラメータからタブを設定
    const tab = searchParams.get('tab');
    if (tab && ['review', 'completed', 'timeline', 'subjects'].includes(tab)) {
      setCurrentTab(tab);
    }
  }, [searchParams]);

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

  // 初期表示時にサマリーを更新
  useEffect(() => {
    const availableSubjects = getAvailableSubjects();
    if (studyLogs.length > 0 && availableSubjects.length > 0) {
      const firstSubject = availableSubjects[0];
      if (!selectedSubject) {
        setSelectedSubject(firstSubject);
      }
      
      const groupedStudyLogs = groupStudyLogsBySubject(studyLogs);
      const subjectLogs = groupedStudyLogs[selectedSubject || firstSubject] || [];
      const totalTime = subjectLogs.reduce((sum, log) => sum + log.duration, 0);
      
      setTimeout(() => {
        const subjectEl = document.getElementById('current-subject');
        const countEl = document.getElementById('current-count');
        const timeEl = document.getElementById('current-time');
        
        if (subjectEl) subjectEl.textContent = getSubjectDisplayName(selectedSubject || firstSubject);
        if (countEl) countEl.textContent = subjectLogs.length.toString();
        if (timeEl) timeEl.textContent = formatTime(totalTime);
      }, 100);
    }
  }, [studyLogs, selectedSubject]);

  const loadData = async () => {
    if (!user) return;

    setIsDataLoading(true);
    try {
      const availableSubjects = getAvailableSubjects();
      
      console.log('🔍 Loading data for user:', user.uid);
      
      // 各データを個別に取得
      const allReviews = await ReviewService.getReviewItems(user.uid);
      const studyRecords = await StudyRecordService.getRecordsByUser(user.uid);
      const todayTasksData = await ReviewService.getTodayTasks(user.uid);
      const progress = await ReviewService.getStudyProgress(user.uid, availableSubjects);

      // 復習アイテムを完了/進行中に分類
      const active = allReviews.filter(item => !item.isCompleted);
      const completed = allReviews.filter(item => item.isCompleted);

      // 復習リスト登録された学習記録から学習ログを生成
      const reviewStudyRecords = studyRecords.filter(record => record.shouldReview);
      const generatedStudyLogs = reviewStudyRecords.map(record => ({
        id: record.id,
        userId: record.userId,
        subject: record.subject,
        unit: record.content,
        content: record.details || record.content,
        studyType: 'practice' as const,
        duration: record.studyMinutes || (record.studyMinutes ? record.studyMinutes * 60 : 0),
        understanding: 'good' as const,
        notes: record.memo,
        studyDate: new Date(record.studyDate),
        createdAt: record.createdAt
      }));

      setReviewItems(allReviews);
      setActiveReviewItems(active);
      setCompletedReviewItems(completed);
      setTodayTasks(todayTasksData);
      setStudyLogs(generatedStudyLogs);
      setStudyProgress(progress);

    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setIsDataLoading(false);
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
    await loadData();
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
        {/* ヘッダー部分にタブを統合 */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">学習カルテ</h1>
            <p className="text-gray-600 mb-6">復習の進捗を管理して、効率的な学習を進めましょう</p>
            
            {/* ヘッダー内のタブリスト */}
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="review" className="text-sm">復習管理</TabsTrigger>
              <TabsTrigger value="completed" className="text-sm">復習完了</TabsTrigger>
              <TabsTrigger value="timeline" className="text-sm">タイムライン</TabsTrigger>
              <TabsTrigger value="subjects" className="text-sm">学習ログ</TabsTrigger>
            </TabsList>
          </div>

          {/* タブコンテンツエリア */}
          <div className="space-y-6">
            {/* 復習管理タブ */}
            <TabsContent value="review" className="space-y-6">
              <TodayTasks
                tasks={todayTasks}
                onTaskSelect={handleTaskSelect}
                getSubjectDisplayName={getSubjectDisplayName}
              />

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

            {/* タイムライン表示タブ */}
            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>タイムライン</span>
                    <Badge variant="outline">{studyLogs.length}件</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    復習リスト登録された学習記録の時系列表示
                  </p>
                </CardHeader>
                <CardContent>
                  {studyLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">学習ログがありません</p>
                      <p className="text-sm text-gray-400">
                        学習記録で「復習リスト登録」をチェックすると、ここに表示されます
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {studyLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Badge 
                              variant="outline" 
                              className="flex-shrink-0 text-xs"
                            >
                              {getSubjectDisplayName(log.subject)}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {log.unit}
                              </div>
                              {log.content !== log.unit && (
                                <div className="text-xs text-gray-500 truncate">
                                  {log.content}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 flex-shrink-0 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(log.duration)}</span>
                            </div>
                            <span className="text-gray-400">
                              {log.studyDate.toLocaleDateString('ja-JP', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="text-center pt-2">
                        <p className="text-xs text-gray-500">
                          全{studyLogs.length}件の学習ログ
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 学習ログタブ（教科別表示） */}
            <TabsContent value="subjects" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span className="text-lg font-semibold">学習ログ</span>
                      <Badge variant="outline">{studyLogs.length}件</Badge>
                    </div>
                    
                    {/* 現在選択中の科目のサマリー */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>科目: <span className="font-medium" id="current-subject">-</span></span>
                      <span>学習記録: <span className="font-medium" id="current-count">0</span>件</span>
                      <span>総学習時間: <span className="font-medium" id="current-time">0分</span></span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    復習リスト登録された学習記録の教科別表示
                  </p>
                </CardHeader>
                <CardContent>
                  {studyLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">学習ログがありません</p>
                      <p className="text-sm text-gray-400">
                        学習記録で「復習リスト登録」をチェックすると、ここに表示されます
                      </p>
                    </div>
                  ) : (
                    <div className="w-full">
                      {/* 科目別小タブ */}
                      <div className="grid w-full gap-1 mb-4 p-1 bg-gray-100 rounded-lg" style={{gridTemplateColumns: `repeat(${availableSubjects.length}, 1fr)`}}>
                        {availableSubjects.map((subject) => {
                          const subjectLogs = groupedStudyLogs[subject] || [];
                          const isActive = selectedSubject === subject;
                          return (
                            <button
                              key={subject}
                              onClick={() => {
                                setSelectedSubject(subject);
                                console.log('Subject changed to:', subject);
                                console.log('Available data for subject:', groupedStudyLogs[subject]);
                                
                                // タブ変更時にサマリーを更新
                                const totalTime = subjectLogs.reduce((sum, log) => sum + log.duration, 0);
                                
                                setTimeout(() => {
                                  const subjectEl = document.getElementById('current-subject');
                                  const countEl = document.getElementById('current-count');
                                  const timeEl = document.getElementById('current-time');
                                  
                                  if (subjectEl) subjectEl.textContent = getSubjectDisplayName(subject);
                                  if (countEl) countEl.textContent = subjectLogs.length.toString();
                                  if (timeEl) timeEl.textContent = formatTime(totalTime);
                                }, 50);
                              }}
                              className={`text-xs px-2 py-1.5 rounded transition-colors ${
                                isActive 
                                  ? 'bg-blue-100 text-blue-800 font-medium' 
                                  : 'hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-medium">{getSubjectDisplayName(subject)}</span>
                                <span className="text-xs opacity-75">{subjectLogs.length}件</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* 選択された科目のログ表示 */}
                      <div className="mt-4">
                        {selectedSubject && (() => {
                          const subjectLogs = groupedStudyLogs[selectedSubject] || [];
                          
                          return subjectLogs.length === 0 ? (
                            <div className="text-center py-8">
                              <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">
                                {getSubjectDisplayName(selectedSubject)}の学習ログがありません
                              </p>
                              <p className="text-xs text-gray-400">
                                学習記録で「復習リスト登録」をチェックすると表示されます
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                              {subjectLogs.map((log) => (
                                <div
                                  key={log.id}
                                  className="bg-white border rounded p-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    {/* 左側：学習内容 */}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">
                                        {log.unit}
                                      </div>
                                      {log.content !== log.unit && (
                                        <div className="text-xs text-gray-500 truncate">
                                          {log.content}
                                        </div>
                                      )}
                                    </div>

                                    {/* 右側：時間と日付 */}
                                    <div className="flex items-center space-x-3 text-xs text-gray-500 ml-4">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTime(log.duration)}</span>
                                      </div>
                                      <span className="text-gray-400">
                                        {log.studyDate.toLocaleDateString('ja-JP', { 
                                          month: 'short', 
                                          day: 'numeric' 
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* メモがある場合のみ表示 */}
                                  {log.notes && (
                                    <div className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                                      💭 {log.notes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
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