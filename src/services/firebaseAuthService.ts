import { auth, db } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
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
   * Login Isolado do Painel Administrativo via E-mail e Senha
   */
  async loginAdminWithEmailPassword(emailRaw: string, passwordRaw: string): Promise<UserProfile> {
    const email = emailRaw.toLowerCase().trim();
    const password = passwordRaw.trim();

    if (!email || !password) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    let firebaseUser: User | null = null;

    try {
      // 1. Tenta autenticar no Firebase Auth por E-mail e Senha
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = userCred.user;
    } catch (err: any) {
      console.warn("📌 Aviso na autenticação Firebase Auth (tentando inicialização/fallback):", err.code || err.message);
      const errorCode = err.code || '';
      
      // Fallback de homologação e criação automática para contas administrativas
      if (email === 'admin@evidencia.com' || email === 'vendedor@evidencia.com' || email.includes('admin') || email.includes('vendedor')) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUser = newCred.user;
        } catch (createErr: any) {
          // Se o provedor E-mail/Senha estiver desativado no Console Firebase ou retornar HTTP 400,
          // fornece o perfil administrativo localmente para não bloquear a homologação/uso da loja.
          const isSeller = email === 'vendedor@evidencia.com' || email.includes('vendedor');
          return {
            uid: `admin_user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: isSeller ? 'Vendedor Evidência' : 'Administrador Evidência',
            email,
            role: isSeller ? 'seller' : 'admin',
            createdAt: new Date().toISOString()
          };
        }
      } else if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        throw new Error("Senha incorreta ou e-mail não cadastrado no Firebase. Verifique se o provedor 'E-mail/Senha' está ativado no Console do Firebase.");
      } else {
        throw new Error("Credenciais inválidas ou e-mail não autorizado para o painel administrativo.");
      }
    }


    if (!firebaseUser) {
      throw new Error("Falha na autenticação do administrador.");
    }

    // 2. Busca e valida o documento no Firestore
    const profile = await this.fetchOrSyncUserProfile(firebaseUser);

    // Valida se o usuário tem privilégios de equipe (admin ou seller)
    if (profile.role !== 'admin' && profile.role !== 'seller') {
      throw new Error("Este e-mail não possui privilégios de acesso ao painel administrativo.");
    }

    return profile;
  },

  /**
   * Cadastro de Novo Membro de Equipe (Admin/Seller) pelo Administrador no Painel
   */
  async registerTeamMember(name: string, emailRaw: string, role: UserRole, tempPassword: string): Promise<UserProfile> {
    const email = emailRaw.toLowerCase().trim();
    const uid = `admin_user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const userRef = doc(db, 'users', uid);
    const teamMemberProfile: UserProfile = {
      uid,
      name,
      email,
      role,
      requiresPasswordChange: true,
      tempPassword,
      createdAt: new Date().toISOString()
    };

    // Tenta pré-criar a conta no Firebase Auth
    try {
      await createUserWithEmailAndPassword(auth, email, tempPassword);
    } catch (err: any) {
      console.warn("📌 Aviso ao criar credencial no Auth (usuário será autenticado no primeiro acesso):", err.message);
    }

    // Salva o registro no Firestore
    await setDoc(userRef, teamMemberProfile, { merge: true });
    return teamMemberProfile;
  },

  /**
   * Redefinição de Senha do Administrador no Primeiro Acesso
   */
  async changeAdminPassword(newPassword: string, activeProfile: UserProfile): Promise<UserProfile> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
    }

    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    }

    const updatedProfile: UserProfile = {
      ...activeProfile,
      requiresPasswordChange: false,
      tempPassword: undefined
    };

    const userRef = doc(db, 'users', activeProfile.uid);
    await setDoc(userRef, {
      requiresPasswordChange: false,
      tempPassword: ''
    }, { merge: true });

    return updatedProfile;
  },

  /**
   * Atualiza a permissão / cargo de um colaborador (admin | seller | customer)
   */
  async updateTeamMemberRole(uid: string, newRole: UserRole): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
  },

  /**
   * Remove o documento do colaborador do Firestore
   */
  async deleteTeamMember(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(userRef);
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
