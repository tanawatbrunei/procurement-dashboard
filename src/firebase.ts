import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// No firebase/storage import: Cloud Storage for Firebase requires the paid
// Blaze plan on new projects even within the free quota. Document/file
// uploads across the app link out to Google Drive instead (see FileVault.tsx,
// KnowledgePage.tsx), so this project can run entirely on the free Spark plan.
// Fill these in .env.local (see .env.example) with your own Firebase project's web config.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Firestore with PERSISTENT local cache (IndexedDB). Repeat visits and page
// refreshes are served from the on-device cache and cost ZERO server reads —
// only changed documents are re-fetched. This is the main lever for keeping
// total reads under the Spark (free) plan's 50k/day quota. The multi-tab
// manager keeps the cache consistent when the app is open in several tabs.
// initializeFirestore must run before any getFirestore(app); if the app was
// already initialized (e.g. Vite HMR re-import), fall back to the existing one.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  firestore = getFirestore(app);
}
export const db = firestore;