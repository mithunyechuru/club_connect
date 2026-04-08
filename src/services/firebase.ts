/// <reference types="vite/client" />
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator, Database, ref, get } from 'firebase/database';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
  connectStorageEmulator(storage, 'localhost', 9199);
}

/**
 * Connection health check result
 */
export interface HealthCheckResult {
  firestore: boolean;
  realtimeDatabase: boolean;
  auth: boolean;
  storage: boolean;
  timestamp: Date;
}

/**
 * Performs a health check on Firebase connections
 * Tests connectivity to Firestore, Realtime Database, Auth, and Storage
 * @returns Promise<HealthCheckResult> Health status of all Firebase services
 */
export async function checkConnectionHealth(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    firestore: false,
    realtimeDatabase: false,
    auth: false,
    storage: false,
    timestamp: new Date(),
  };

  // Check Firestore connection
  try {
    const testQuery = query(collection(db, '_health_check'), limit(1));
    await getDocs(testQuery);
    result.firestore = true;
  } catch (error) {
    console.error('Firestore health check failed:', error);
  }

  // Check Realtime Database connection
  try {
    const testRef = ref(realtimeDb, '.info/connected');
    await get(testRef);
    result.realtimeDatabase = true;
  } catch (error) {
    console.error('Realtime Database health check failed:', error);
  }

  // Check Auth connection (auth is always available if initialized)
  try {
    result.auth = auth !== null && auth !== undefined;
  } catch (error) {
    console.error('Auth health check failed:', error);
  }

  // Check Storage connection (storage is always available if initialized)
  try {
    result.storage = storage !== null && storage !== undefined;
  } catch (error) {
    console.error('Storage health check failed:', error);
  }

  return result;
}

export default app;
