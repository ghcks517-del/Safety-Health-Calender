import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import { LocalFirestore, LocalAuth } from './local-store.js';

dotenv.config();

const localFirestore = new LocalFirestore();
const localAuth = new LocalAuth();

let realDb: any = null;
let realAuth: any = null;

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
    realDb = getFirestore();
    realAuth = getAuth();
  } catch (error) {
    console.warn('Real Firebase Admin initialization failed, using persistent local store:', error);
  }
}

// Export db and auth, preferring real Firebase if validly initialized with service account,
// otherwise using the persistent file-backed store
export const db: any = realDb || localFirestore;
export const auth: any = realAuth || localAuth;
export const isLocalMode = !realDb;
