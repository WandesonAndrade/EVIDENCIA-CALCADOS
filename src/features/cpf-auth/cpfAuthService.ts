import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  deleteUser,
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { cleanCpf, isValidCpf } from './cpfUtils';
import { getFriendlyAuthErrorMessage } from './authErrors';
import { CpfCheckResult, PreRegisteredClient } from './types';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { UserProfile } from '../../types';

/**
 * Serviço modular para fluxo de Onboarding, Login e Redefinição de Senha por CPF
 * Compatível com Firebase v9+ Modular e Firestore
 */

/**
 * 1. Verifica status do CPF antes do cadastro
 * - Se estiver em pre_registered_clients e status === 'pending': retorna nome pré-cadastrado
 * - Se estiver com status === 'registered': avisa que já possui cadastro
 * - Se não existir em pre_registered_clients: verifica se já existe em users, senão permite novo cadastro
 */
export async function checkCpfPreRegistration(rawCpf: string): Promise<CpfCheckResult> {
  const cpf = cleanCpf(rawCpf);

  if (!isValidCpf(cpf)) {
    return {
      status: 'not_pre_registered',
      message: 'Por favor, digite um CPF válido contendo 11 dígitos.',
    };
  }

  try {
    // 1. Consulta o documento pre_registered_clients/{cpf}
    const preRef = doc(db, 'pre_registered_clients', cpf);
    const preSnap = await getDoc(preRef);

    if (preSnap.exists()) {
      const data = preSnap.data() as PreRegisteredClient;
      if (data.status === 'pending') {
        return {
          status: 'pre_registered_pending',
          name: data.name || '',
        };
      }
      if (data.status === 'registered') {
        return {
          status: 'already_registered',
          name: data.name,
          message: 'Este CPF já possui cadastro ativo. Por favor, faça login com sua senha ou redefina o acesso.',
        };
      }
    }

    // 2. Se não estiver em pre_registered_clients, checa se já existe em users
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('cpf', '==', cpf), limit(1));
    const userSnap = await getDocs(q);

    if (!userSnap.empty) {
      const existingUser = userSnap.docs[0].data() as UserProfile;
      return {
        status: 'already_registered',
        name: existingUser.name,
        message: 'Este CPF já possui cadastro ativo no site. Faça login com sua senha.',
      };
    }

    // 3. Não pré-cadastrado na loja física nem cadastrado no site -> Permite novo cadastro no site
    return {
      status: 'not_pre_registered',
      message: 'Novo cliente! Preencha seu nome, e-mail e senha para criar sua conta.',
    };
  } catch (err: any) {
    console.error('[cpfAuthService] Erro ao verificar pré-cadastro:', err);
    throw new Error(getFriendlyAuthErrorMessage(err));
  }
}

/**
 * Resolve o e-mail real do usuário a partir do CPF
 * Abordagem B: Tenta endpoint backend seguro (/api/auth/resolve-cpf) com fallback direto no Firestore
 */
export async function resolveEmailByCpf(rawCpf: string): Promise<{ email: string; name?: string } | null> {
  const cpf = cleanCpf(rawCpf);
  if (!cpf || cpf.length !== 11) return null;

  // 1. Tenta backend seguro primeiro
  try {
    const res = await fetch('/api/auth/resolve-cpf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.found && data.email) {
        return { email: data.email, name: data.name };
      }
      if (data && data.found === false) {
        return null;
      }
    }
  } catch (backendError) {
    console.warn('[cpfAuthService] Backend resolve-cpf inacessível, usando fallback Firestore:', backendError);
  }

  // 2. Fallback client-side no Firestore
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('cpf', '==', cpf), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const data = snap.docs[0].data();
      const realEmail = data.emailReal || data.email;
      if (realEmail) {
        return { email: String(realEmail).trim().toLowerCase(), name: data.name };
      }
    }
  } catch (firestoreError) {
    console.error('[cpfAuthService] Erro ao consultar email por CPF no Firestore:', firestoreError);
  }

  return null;
}

/**
 * 2. Finaliza o cadastro com Firebase Auth + Firestore
 * - Cria conta no Firebase Auth com email real e senha
 * - Grava documento na coleção users/{uid}
 * - Atualiza pre_registered_clients/{cpf} com status: 'registered' e claimedBy: uid (se existia pré-cadastro)
 * - Em caso de erro ao gravar no Firestore, faz rollback deletando o usuário criado no Auth
 */
export async function registerClient(params: {
  cpf: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<UserProfile> {
  const cleanCpfValue = cleanCpf(params.cpf);
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim();

  if (!isValidCpf(cleanCpfValue)) {
    throw new Error('Por favor, informe um CPF válido com 11 dígitos.');
  }

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Por favor, informe o seu nome completo.');
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Por favor, informe um e-mail válido.');
  }

  if (!params.password || params.password.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres.');
  }

  let createdUser: User | null = null;

  try {
    // 1. Cria usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
    createdUser = userCredential.user;

    // Atualiza nome de exibição no Firebase Auth
    try {
      await updateProfile(createdUser, { displayName: cleanName });
    } catch (profileErr) {
      console.warn('[cpfAuthService] Não foi possível atualizar displayName no Auth:', profileErr);
    }

    const uid = createdUser.uid;
    const userDocRef = doc(db, 'users', uid);
    const preRegisteredRef = doc(db, 'pre_registered_clients', cleanCpfValue);

    // 2. Grava no Firestore (atômico com writeBatch se for cliente pré-cadastrado)
    const preSnap = await getDoc(preRegisteredRef);
    const isPreRegistered = preSnap.exists();

    const newProfile: UserProfile = {
      uid,
      name: cleanName,
      email: cleanEmail,
      emailReal: cleanEmail,
      cpf: cleanCpfValue,
      telefone: params.phone?.trim() || '',
      role: 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isPreRegistered) {
      const batch = writeBatch(db);
      batch.set(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      batch.update(preRegisteredRef, {
        status: 'registered',
        claimedBy: uid,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } else {
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return newProfile;
  } catch (error: any) {
    console.error('[cpfAuthService] Erro ao registrar cliente:', error);

    // Rollback de segurança: se criou conta no Auth mas falhou depois, remove a conta para não deixar órfão
    if (createdUser && error.code !== 'auth/email-already-in-use') {
      try {
        await deleteUser(createdUser);
        console.warn('[cpfAuthService] Rollback executado: usuário Auth apagado devido a falha no banco de dados.');
      } catch (rollbackErr) {
        console.error('[cpfAuthService] Falha no rollback do usuário Auth:', rollbackErr);
      }
    }

    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

/**
 * 3. Fluxo de Login por CPF e Senha
 * - Consulta email real associado ao CPF em users
 * - Se encontrado: realiza login nativo com signInWithEmailAndPassword usando o e-mail real
 * - Se não encontrado: tenta fallback com o serviço legado de autenticação por CPF
 */
export async function loginWithCpfAndEmail(rawCpf: string, password: string): Promise<UserProfile> {
  const cpf = cleanCpf(rawCpf);

  if (!cpf || cpf.length !== 11) {
    throw new Error('Informe um CPF válido com 11 dígitos.');
  }

  if (!password || password.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres.');
  }

  // 1. Busca e-mail real associado ao CPF
  const resolved = await resolveEmailByCpf(cpf);

  if (resolved && resolved.email) {
    try {
      const credential = await signInWithEmailAndPassword(auth, resolved.email, password);
      const user = credential.user;

      // Obtém ou sincroniza perfil
      const profile = await firebaseAuthService.fetchOrSyncUserProfile(user);
      return profile;
    } catch (authErr: any) {
      console.error('[cpfAuthService] Falha ao autenticar com email real:', authErr);
      throw new Error(getFriendlyAuthErrorMessage(authErr));
    }
  }

  // 2. Fallback para usuários cadastrados no formato anterior (email sintético)
  try {
    return await firebaseAuthService.loginComCpf(cpf, password);
  } catch (legacyErr: any) {
    console.warn('[cpfAuthService] Falha no fallback legado de login:', legacyErr);
    throw new Error(getFriendlyAuthErrorMessage(legacyErr));
  }
}

/**
 * 4. Fluxo de Redefinição de Senha
 * - O usuário digita o CPF na tela de "esqueci minha senha"
 * - Busca o e-mail real associado a esse CPF na coleção users
 * - Dispara sendPasswordResetEmail nativo do Firebase
 * - Por segurança e privacidade anti-enumeração, retorna sempre confirmação genérica
 */
export async function requestPasswordResetByCpf(rawCpf: string): Promise<{ success: boolean; message: string; maskedEmail?: string }> {
  const cpf = cleanCpf(rawCpf);

  if (!isValidCpf(cpf)) {
    throw new Error('Por favor, informe um CPF válido com 11 dígitos.');
  }

  const genericSuccessMessage = 'Se o CPF estiver cadastrado, enviamos as instruções para o seu e-mail.';

  try {
    const resolved = await resolveEmailByCpf(cpf);

    if (resolved && resolved.email) {
      await sendPasswordResetEmail(auth, resolved.email);

      // Mascara o e-mail para feedback amigável (ex: wa*****@gmail.com)
      const parts = resolved.email.split('@');
      let masked = resolved.email;
      if (parts.length === 2 && parts[0].length > 2) {
        masked = `${parts[0].slice(0, 2)}*****@${parts[1]}`;
      }

      return {
        success: true,
        message: `Instruções de recuperação enviadas para ${masked}. Verifique sua caixa de entrada e spam.`,
        maskedEmail: masked,
      };
    }

    // Se não encontrou e-mail em users, retorna mensagem genérica anti-enumeração
    return {
      success: true,
      message: genericSuccessMessage,
    };
  } catch (err: any) {
    console.error('[cpfAuthService] Erro ao disparar redefinição de senha:', err);
    throw new Error(getFriendlyAuthErrorMessage(err));
  }
}
