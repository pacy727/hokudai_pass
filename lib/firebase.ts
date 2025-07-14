import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// サービス初期化
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 開発環境でのエミュレーター接続
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    console.log('Emulator already connected');
  }
}

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
  activeTimers: 'active_timers'
} as const;
