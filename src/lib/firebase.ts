import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || appletConfig.apiKey || "AIzaSyDZOI1xMviL5k1eIK8IjggCLYZ0HLT7d8k",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "safety-n-health-calender.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || "safety-n-health-calender",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "safety-n-health-calender.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "684990652441",
  appId: metaEnv.VITE_FIREBASE_APP_ID || appletConfig.appId || "1:684990652441:web:eaf8ed5d2e1ad5f52c4a88",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || "G-869P0PG9XZ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connection test as per Firebase guidelines
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase connection notice: client is offline or network is disconnected.");
    }
  }
}
testConnection();

export default app;
