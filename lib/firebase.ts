import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase初期化（重複初期化を防ぐ）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// サービス初期化（本番Firebase使用）
export const auth = getAuth(app);
export const db = getFirestore(app);

// オフライン対応
export const enableOfflineSupport = () => enableNetwork(db);
export const disableOfflineSupport = () => disableNetwork(db);

// 接続状態監視
export const monitorConnection = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', enableOfflineSupport);
    window.addEventListener('offline', disableOfflineSupport);
  }
};

// コレクション参照
export const collections = {
  users: 'users',
  studyRecords: 'study_records',
  studyGoals: 'study_goals',
  realtimeStatus: 'realtime_study_status',
  declarations: 'study_declarations',
  alerts: 'group_alerts',
  activeTimers: 'active_timers',
  // 復習問題リクエスト関連（新規追加）
  reviewQuestionRequests: 'review_question_requests',
  reviewQuestions: 'review_questions',
  reviewItems: 'review_items',
  reviewResults: 'review_results',
} as const;