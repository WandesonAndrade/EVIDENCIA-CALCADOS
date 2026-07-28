import { auth, db } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

export const firebaseAuthService = {
  /**
   * Escuta alterações de estado de autenticação no Firebase Auth
   */
  subscribeAuthState(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Verifica existência no Firestore no login:
   * Se o documento não existir por UID ou e-mail, cria um registro inicial com dados básicos.
   * Se já existir, carrega todos os dados cadastrados preservando campos reais preenchidos.
   */
  async fetchOrSyncUserProfile(user: User): Promise<UserProfile> {
    const uid = user.uid;
    const email = (user.email || '').toLowerCase().trim();
    const name = user.displayName || 'Cliente Evidência';
    const photoURL = user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    const userRef = doc(db, 'users', uid);
    let existingProfile: UserProfile | null = null;

    try {
      // 1. Tenta buscar diretamente pelo UID
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        existingProfile = snap.data() as UserProfile;
      } else if (email) {
        // 2. Se não encontrou por UID, pesquisa por e-mail para vincular cadastro prévio
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          existingProfile = querySnap.docs[0].data() as UserProfile;
        }
      }
    } catch (err) {
      console.warn("📌 Erro ao verificar existência do usuário no Firestore (fallback ativo):", err);
    }

    if (existingProfile) {
      // O documento já existe: preserva 100% dos dados reais já salvos (cpf, endereco, dataNascimento, etc)
      const mergedProfile: UserProfile = {
        ...existingProfile,
        uid,
        name: existingProfile.name || name,
        email: existingProfile.email || email,
        photoURL: photoURL || existingProfile.photoURL
      };

      try {
        await setDoc(userRef, mergedProfile, { merge: true });
      } catch (err) {
        console.warn("📌 Erro ao atualizar documento existente no Firestore:", err);
      }

      return mergedProfile;
    } else {
      // O documento não existe: cria o registro inicial com dados básicos
      const initialProfile: UserProfile = {
        uid,
        name,
        email,
        role: (email === 'admin@evidencia.com' ? 'admin' : email === 'vendedor@evidencia.com' ? 'seller' : 'customer') as UserRole,
        photoURL,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(userRef, initialProfile, { merge: true });
      } catch (err) {
        console.warn("📌 Erro ao criar documento inicial do usuário no Firestore:", err);
      }

      return initialProfile;
    }
  },

  /**
   * Realiza login via Google com popup e verificação de registro no Firestore
   */
  async loginWithGoogle(): Promise<UserProfile | null> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      return this.fetchOrSyncUserProfile(result.user);
    }
    return null;
  },

  /**
   * Realiza logout atômico no Firebase Auth
   */
  async logout(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("📌 Erro ao fazer signOut no Firebase Auth:", err);
    }
  }
};
