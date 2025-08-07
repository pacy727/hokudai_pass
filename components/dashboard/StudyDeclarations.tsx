'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { StudyDeclaration } from '@/types/realtime';
import { User } from '@/types/auth';
import { GraduationCap } from 'lucide-react';

interface StudyDeclarationsProps {
  declarations: StudyDeclaration[];
  postDeclaration: (declaration: string) => Promise<string>;
  user: User;
  userGradesMap?: Map<string, string>; // 学年情報マップを追加
}

export function StudyDeclarations({ 
  declarations, 
  postDeclaration, 
  user,
  userGradesMap = new Map()
}: StudyDeclarationsProps) {
  const { toast } = useToast();
  const [newDeclaration, setNewDeclaration] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showAllDeclarations, setShowAllDeclarations] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('全学年');

  // 利用可能な学年を取得
  const getAvailableGrades = (): string[] => {
    const grades = new Set<string>();
    userGradesMap.forEach(grade => {
      if (grade) grades.add(grade);
    });
    return ['全学年', ...Array.from(grades).sort()];
  };

  // 学年名の表示形式を取得
  const getGradeDisplayName = (grade: string) => {
    const gradeMap = {
      '1学年': '1学年',
      '2学年': '2学年', 
      '3学年': '3学年',
      'その他': 'その他'
    };
    return gradeMap[grade as keyof typeof gradeMap] || grade;
  };

  // 学年でフィルタリングされた宣言を取得
  const getFilteredDeclarations = () => {
    if (gradeFilter === '全学年') {
      return declarations;
    }
    
    return declarations.filter(declaration => {
      const userGrade = userGradesMap.get(declaration.userId);
      return userGrade === gradeFilter;
    });
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

  // 表示する宣言を取得
  const getDisplayDeclarations = () => {
    const filteredDeclarations = getFilteredDeclarations();
    return showAllDeclarations ? filteredDeclarations.slice(0, 50) : filteredDeclarations.slice(0, 15);
  };

  const availableGrades = getAvailableGrades();
  const filteredDeclarations = getFilteredDeclarations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📢 学習宣言
            <Badge variant="default" className="bg-purple-500">
              {filteredDeclarations.length}件
            </Badge>
            {gradeFilter !== '全学年' && (
              <Badge variant="outline" className="bg-blue-50">
                {getGradeDisplayName(gradeFilter)}
              </Badge>
            )}
          </CardTitle>
        </div>
        
        {/* 学年フィルタ */}
        <div className="flex items-center gap-3">
          <GraduationCap className="w-4 h-4" />
          <span className="text-sm font-medium">学年フィルタ:</span>
          <Select onValueChange={(value) => setGradeFilter(value)} value={gradeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="学年を選択" />
            </SelectTrigger>
            <SelectContent>
              {availableGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade === '全学年' ? '🌍 全学年' : `🎓 ${getGradeDisplayName(grade)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {filteredDeclarations.length}件
          </Badge>
        </div>
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
              {gradeFilter !== '全学年' 
                ? `${getGradeDisplayName(gradeFilter)}の学習宣言がありません` 
                : '学習宣言がありません'
              }
            </div>
          ) : (
            getDisplayDeclarations().map((declaration) => {
              const userGrade = userGradesMap.get(declaration.userId);
              return (
                <div key={declaration.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{declaration.userName}</span>
                      {userGrade && (
                        <Badge variant="outline" className="text-xs bg-gray-100">
                          {getGradeDisplayName(userGrade)}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {formatDistanceToNow(declaration.createdAt, { locale: ja })}前
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-800">{declaration.declaration}</p>
                  </div>
                </div>
              );
            })
          )}
          {filteredDeclarations.length > 15 && (
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
  );
}