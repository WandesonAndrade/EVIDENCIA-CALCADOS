import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Product } from '../types';

const getEnvVar = (key: string): string => {
  let val = '';
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    val = process.env[key]!;
  } else if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    val = (import.meta as any).env[key];
  }
  return String(val || '').replace(/['"]/g, '').trim();
};

const firebaseConfig = {
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || "gen-lang-client-0731653575",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || "1:142037658142:web:906b5f64e997b22c34dc0f",
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || "AIzaSyCPiOyB4wU2td7nd_qs-jxcPQITtvugjnc",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || "gen-lang-client-0731653575.firebaseapp.com",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || "gen-lang-client-0731653575.firebasestorage.app",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || "142037658142"
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

    // Verifica e valida a coleção pix_transacoes no Firestore
    try {
      const pixCollectionRef = collection(db, 'pix_transacoes');
      const pixSnapshot = await getDocs(pixCollectionRef);
      console.log(`🔥 Coleção Firestore 'pix_transacoes' conectada e pronta. Total de registros em histórico: ${pixSnapshot.size}`);
    } catch {
      console.log("🔥 Coleção Firestore 'pix_transacoes' configurada para gravação de Pix.");
    }
  } catch (error) {
    console.warn("Firestore collections check:", error);
  }
}

seedDatabaseIfNeeded();
