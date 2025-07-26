'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { StudyDeclaration } from '@/types/realtime';
import { User } from '@/types/auth';

interface StudyDeclarationsProps {
  declarations: StudyDeclaration[];
  postDeclaration: (declaration: string) => Promise<string>;
  user: User;
}

export function StudyDeclarations({ 
  declarations, 
  postDeclaration, 
  user 
}: StudyDeclarationsProps) {
  const { toast } = useToast();
  const [newDeclaration, setNewDeclaration] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showAllDeclarations, setShowAllDeclarations] = useState(false);

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
    const recentDeclarations = declarations.slice(0, 50);
    return showAllDeclarations ? recentDeclarations : recentDeclarations.slice(0, 15);
  };

  return (
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
  );
}