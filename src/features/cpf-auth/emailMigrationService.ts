import { 
  verifyBeforeUpdateEmail, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  User 
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getFriendlyAuthErrorMessage } from './authErrors';
import { EmailMigrationResult } from './types';

/**
 * Domínios fictícios utilizados para geração sintética de e-mail por CPF
 */
export const FICTITIOUS_EMAIL_DOMAINS = [
  '@evidenciacalcados.com.br',
  '@evidencia.com',
] as const;

/**
 * Verifica se um endereço de e-mail é fictício / gerado por CPF
 */
export function isFictitiousEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();

  return FICTITIOUS_EMAIL_DOMAINS.some(domain => clean.endsWith(domain));
}

/**
 * Validação rigorosa do novo e-mail real informado pelo usuário
 */
export function validateRealEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Por favor, informe seu e-mail.' };
  }

  const clean = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'Por favor, informe um formato de e-mail válido (ex: seu.nome@gmail.com).' };
  }

  if (isFictitiousEmail(clean)) {
    return { 
      valid: false, 
      error: 'Por favor, utilize seu e-mail pessoal real (ex: Gmail, Hotmail, Outlook), diferente do e-mail provisório da loja.' 
    };
  }

  return { valid: true };
}

/**
 * Inicia o processo de migração de e-mail enviando link de confirmação via verifyBeforeUpdateEmail
 * e atualizando o Firestore em users/{uid}
 */
export async function requestEmailMigration(
  user: User, 
  newEmail: string
): Promise<EmailMigrationResult> {
  const validation = validateRealEmail(newEmail);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanEmail = newEmail.trim().toLowerCase();

  try {
    // 1. Envia link de verificação para o novo e-mail no Firebase Auth
    await verifyBeforeUpdateEmail(user, cleanEmail);

    // 2. Atualiza os campos no Firestore para garantir registro do e-mail solicitado
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        email: cleanEmail,
        emailReal: cleanEmail,
        pendingEmailVerification: true,
        emailMigrationRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (firestoreErr) {
      console.warn('[emailMigrationService] Aviso ao atualizar Firestore durante migração:', firestoreErr);
    }

    return {
      success: true,
      message: `Enviamos um link de confirmação para ${cleanEmail}. Por favor, acerte sua caixa de entrada e spam para validar.`,
    };
  } catch (error: any) {
    console.error('[emailMigrationService] Erro em requestEmailMigration:', error);

    // Caso exija login recente por segurança
    if (error.code === 'auth/requires-recent-login') {
      return {
        success: false,
        requiresReauth: true,
        message: 'Por segurança, confirme sua senha atual para autorizar a atualização do e-mail.',
      };
    }

    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

/**
 * Reautentica o usuário com a senha atual e em seguida executa o fluxo de migração de e-mail
 */
export async function reauthenticateAndMigrateEmail(
  user: User,
  currentPassword: string,
  newEmail: string
): Promise<EmailMigrationResult> {
  if (!user.email) {
    throw new Error('Não foi possível identificar o e-mail atual do usuário.');
  }

  if (!currentPassword || currentPassword.length < 6) {
    throw new Error('Por favor, informe sua senha atual com no mínimo 6 caracteres.');
  }

  const validation = validateRealEmail(newEmail);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanEmail = newEmail.trim().toLowerCase();

  try {
    // 1. Cria a credencial com o e-mail atual (mesmo que fictício) e a senha informada
    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    // 2. Reautentica no Firebase Auth
    await reauthenticateWithCredential(user, credential);

    // 3. Executa a solicitação de atualização do e-mail
    await verifyBeforeUpdateEmail(user, cleanEmail);

    // 4. Atualiza o documento no Firestore
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        email: cleanEmail,
        emailReal: cleanEmail,
        pendingEmailVerification: true,
        emailMigrationRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (firestoreErr) {
      console.warn('[emailMigrationService] Aviso ao atualizar Firestore após reautenticação:', firestoreErr);
    }

    return {
      success: true,
      message: `Enviamos um link de confirmação para ${cleanEmail}. Verifique sua caixa de entrada ou spam.`,
    };
  } catch (error: any) {
    console.error('[emailMigrationService] Erro em reauthenticateAndMigrateEmail:', error);
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}
