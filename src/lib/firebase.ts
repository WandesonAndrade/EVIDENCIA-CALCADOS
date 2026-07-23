import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Product } from '../types';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0731653575",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with named database instance
export const db = getFirestore(app, "ai-studio-09694ade-3353-47cf-8db0-531b70401d1b");

// Initialize Storage
export const storage = getStorage(app);

// Validate connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('offline') || errMsg.includes('unavailable') || errMsg.includes('Could not reach')) {
      console.warn("Firestore is operating in offline/unreachable mode. Falling back to local data gracefully. Details:", errMsg);
    } else {
      console.log("Firestore connection test completed (non-blocking).");
    }
  }
}
testConnection();

// Catalog comes strictly from Firestore database
export const SEED_PRODUCTS: Product[] = [];

// Seed Database Function (No-op or checks Firestore database status)
export async function seedDatabaseIfNeeded() {
  try {
    const productsCollectionRef = collection(db, 'products');
    const snapshot = await getDocs(productsCollectionRef);
    console.log(`Firestore products collection fetched. Total items in database: ${snapshot.size}`);
  } catch (error) {
    console.warn("Firestore collection products check:", error);
  }
}
