# 北大専科学習管理システム - HokudaiTracker Optimized

偏差値50→65確実達成を支援する学習管理システム

## 🚀 機能

- **タイマー機能**: ワンタップで学習開始、自動時間計測
- **リアルタイム共有**: メンバーの学習状況をリアルタイム表示
- **詳細分析**: 教科別・日別の学習時間分析
- **学習宣言**: グループでモチベーション維持
- **PWA対応**: スマートフォンアプリのような操作感

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, TailwindCSS
- **バックエンド**: Firebase (Firestore, Authentication, Storage)
- **状態管理**: Zustand
- **UI**: shadcn/ui, Recharts
- **デプロイ**: Vercel

## 📦 セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd hokudai-tracker
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`をコピーして`.env.local`を作成し、Firebase設定を入力してください。

```bash
cp .env.example .env.local
```

### 4. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Authentication, Firestore Database, Storageを有効化
3. ウェブアプリを追加して設定情報を取得
4. `.env.local`に設定情報を入力

### 5. Firestoreセキュリティルールの設定

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー情報
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    
    // リアルタイム学習状況（全員が読み取り可能、自分のみ書き込み可能）
    match /realtime_study_status/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 学習宣言（全員が読み取り可能、自分のみ書き込み可能）
    match /study_declarations/{declarationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 🚀 デプロイ

### Vercelでのデプロイ

1. [Vercel](https://vercel.com)にアカウント作成
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ

```bash
npm run build
```

### 環境変数（Vercel）

以下の環境変数をVercelの設定で追加してください：

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 📱 PWA設定

### アイコンの準備

`public/icons/` ディレクトリに以下のサイズのアイコンを配置してください：

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

## 🧪 テスト

```bash
# 単体テスト実行
npm run test

# カバレッジ付きテスト
npm run test:coverage

# テストを監視モードで実行
npm run test:watch
```

## 📊 主要機能

### タイマー機能
- ワンタップで学習開始
- バックグラウンドでも継続
- 自動で記録ページに遷移

### リアルタイム機能
- メンバーの学習状況をリアルタイム表示
- 学習宣言とリアクション機能
- グループでのモチベーション維持

### 学習記録
- 科目別の詳細記録
- 自動計算された学習時間
- メモ・感想の記録

### 分析機能
- 日別・週別・月別の統計
- 教科別進捗管理
- 目標達成率の可視化

## 🗂️ プロジェクト構造

```
hokudai-tracker/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── dashboard/         # ダッシュボード
│   ├── record/           # 記録ページ
│   ├── timer/            # タイマーページ
│   ├── globals.css       # グローバルCSS
│   ├── layout.tsx        # ルートレイアウト
│   └── page.tsx          # ホーム（レポート）
├── components/           # 再利用可能コンポーネント
│   ├── ui/              # shadcn/ui components
│   ├── charts/          # グラフコンポーネント
│   └── SubjectButton.tsx # 科目ボタン
├── lib/                 # ユーティリティ
│   ├── firebase.ts      # Firebase設定
│   ├── db/              # データベース操作
│   └── utils.ts         # ユーティリティ関数
├── hooks/               # カスタムフック
│   ├── useAuth.ts       # 認証フック
│   ├── useTimer.ts      # タイマーフック
│   └── useRealtime.ts   # リアルタイム機能
├── stores/              # 状態管理
│   ├── authStore.ts     # 認証状態
│   ├── timerStore.ts    # タイマー状態
│   └── recordStore.ts   # 記録状態
└── types/               # TypeScript型定義
    ├── auth.ts
    ├── study.ts
    └── realtime.ts
```

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# 型チェック
npm run type-check

# リント実行
npm run lint

# リント修正
npm run lint:fix
```

## 📈 パフォーマンス最適化

- React Query によるサーバー状態管理
- Zustand による軽量クライアント状態管理
- 遅延ローディング対応
- PWA による高速な操作感

## 🔒 セキュリティ

- Firebase Authentication による認証
- Firestore セキュリティルールによるデータ保護
- クライアントサイドでの最小限の権限設定

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🆘 サポート

問題や質問がある場合は、GitHub Issues を作成してください。

## 🎯 ロードマップ

- [ ] 通知機能の追加
- [ ] 学習計画の自動生成
- [ ] 成績分析の詳細化
- [ ] チーム戦機能
- [ ] 学習教材の共有機能

---

**北大専科学習管理システム** - 偏差値50→65の確実な達成を支援します！🚀
