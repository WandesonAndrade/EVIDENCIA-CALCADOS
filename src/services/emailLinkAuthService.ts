import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
  ActionCodeSettings,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile } from "../types";
import { cleanUndefinedProperties } from "../utils/cleanObject";
import { firebaseAuthService } from "./firebaseAuthService";

const STORAGE_KEYS = {
  EMAIL_FOR_SIGN_IN: "evidencia_email_for_signin",
  EMAIL_FOR_LINKING: "evidencia_email_for_linking",
};

/**
 * Configuração das URLs de redirecionamento para o Firebase Auth Action Link
 */
const getActionCodeSettings = (flow: "login" | "link"): ActionCodeSettings => {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://evidenciacalcados.com";

  return {
    url: `${origin}/#${flow === "login" ? "login" : "meus-dados"}?flow=${flow}`,
    handleCodeInApp: true,
  };
};

export const emailLinkAuthService = {
  /**
   * 1. FLUXO DE VINCULAÇÃO (ÁREA LOGADA)
   * Envia o link de verificação/vinculação para o e-mail real do usuário logado
   */
  async sendLinkingEmail(emailInput: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Você precisa estar autenticado para vincular um e-mail.");
    }

    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Por favor, informe um endereço de e-mail válido.");
    }

    // Verifica se este e-mail já está vinculado a outro cadastro existente
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("emailReal", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const isAnotherUser = querySnapshot.docs.some((d) => d.id !== currentUser.uid);
      if (isAnotherUser) {
        throw new Error(
          "Este e-mail já está vinculado a outro cadastro no sistema. Utilize outro e-mail."
        );
      }
    }

    const actionCodeSettings = getActionCodeSettings("link");

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEYS.EMAIL_FOR_LINKING, email);
      }
    } catch (error: any) {
      console.error("Erro ao enviar link de vinculação de e-mail:", error);
      throw new Error(
        error.message || "Falha ao enviar e-mail de vinculação. Tente novamente mais tarde."
      );
    }
  },

  /**
   * 1.1 MANIPULADOR DE RETORNO DA VINCULAÇÃO (ÁREA LOGADA)
   * Captura o link recebido, gera a credencial e anexa à conta com linkWithCredential + updateDoc
   */
  async completeEmailLinking(
    providedUrl?: string,
    providedEmail?: string
  ): Promise<{ success: boolean; email: string }> {
    const currentUrl =
      providedUrl || (typeof window !== "undefined" ? window.location.href : "");

    if (!isSignInWithEmailLink(auth, currentUrl)) {
      throw new Error("O link de autenticação é inválido ou expirou.");
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error(
        "Sessão de usuário não encontrada. Faça login com seu CPF e senha antes de concluir a vinculação."
      );
    }

    let email =
      providedEmail ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEYS.EMAIL_FOR_LINKING)
        : null);

    if (!email) {
      throw new Error(
        "EMAIL_REQUIRED: Por favor, confirme o e-mail que recebeu o link para concluir a vinculação."
      );
    }

    email = email.trim().toLowerCase();

    try {
      // 1. Gera a credencial de autenticação por link
      const credential = EmailAuthProvider.credentialWithLink(email, currentUrl);

      // 2. Anexa a nova credencial de e-mail à conta existente (criada via CPF)
      await linkWithCredential(currentUser, credential);

      // 3. Atualiza o documento no Firestore em /users/{uid} com emailReal e temEmailVinculado
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(
        userDocRef,
        cleanUndefinedProperties({
          emailReal: email,
          googleEmail: email,
          temEmailVinculado: true,
          updatedAt: new Date().toISOString(),
        })
      );

      // 4. Se houver espelho erp_cpf_{cpf}, sincroniza o registro
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.cpf) {
          const cpfClean = userData.cpf.replace(/\D/g, "");
          const erpCpfRef = doc(db, "users", `erp_cpf_${cpfClean}`);
          await setDoc(
            erpCpfRef,
            cleanUndefinedProperties({
              emailReal: email,
              googleEmail: email,
              temEmailVinculado: true,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        }
      }

      // Limpa storage temporário
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.EMAIL_FOR_LINKING);
      }

      return { success: true, email };
    } catch (error: any) {
      console.error("Erro ao vincular e-mail à conta:", error);
      if (error.code === "auth/credential-already-in-use") {
        throw new Error(
          "Este e-mail já está vinculado a outra conta de acesso. Use um e-mail diferente."
        );
      }
      if (error.code === "auth/invalid-action-code") {
        throw new Error("Este link de vinculação já foi utilizado ou expirou.");
      }
      throw error;
    }
  },

  /**
   * 2. FLUXO DE LOGIN SEGURO (ACESSO RÁPIDO)
   * Consulta prévia no Firestore antes do envio para impedir criação de contas acidentais
   */
  async sendQuickAccessLoginEmail(emailInput: string): Promise<void> {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Por favor, informe um endereço de e-mail válido.");
    }

    // 1. Busca no Firestore se o e-mail digitado já está salvo em algum documento existente
    const usersRef = collection(db, "users");
    const qEmailReal = query(usersRef, where("emailReal", "==", email));
    const snapEmailReal = await getDocs(qEmailReal);

    let hasRegisteredAccount = !snapEmailReal.empty;

    // Fallback: Verifica também se está em email cadastrado ou whitelist
    if (!hasRegisteredAccount) {
      const qEmail = query(usersRef, where("email", "==", email));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        hasRegisteredAccount = true;
      }
    }

    // Membro de equipe whitelist
    const isMasterAdmin =
      email === "wandesonandrade33@gmail.com" ||
      email === "admin@evidencia.com" ||
      email === "vendedor@evidencia.com";

    if (!hasRegisteredAccount && !isMasterAdmin) {
      throw new Error(
        "Este e-mail não está associado a nenhum cadastro. Por favor, acesse com CPF e Senha para vinculá-lo."
      );
    }

    // 2. E-mail verificado -> Envia o link de autenticação seguro
    const actionCodeSettings = getActionCodeSettings("login");

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEYS.EMAIL_FOR_SIGN_IN, email);
      }
    } catch (error: any) {
      console.error("Erro ao enviar link de login sem senha:", error);
      throw new Error(
        error.message || "Falha ao enviar o link de acesso. Verifique sua conexão e tente novamente."
      );
    }
  },

  /**
   * 3. RETORNO DO LOGIN RÁPIDO
   * Intercepta o retorno do link e autentica via signInWithEmailLink
   */
  async completeQuickAccessLogin(
    providedUrl?: string,
    providedEmail?: string
  ): Promise<UserProfile> {
    const currentUrl =
      providedUrl || (typeof window !== "undefined" ? window.location.href : "");

    if (!isSignInWithEmailLink(auth, currentUrl)) {
      throw new Error("Link de autenticação inválido ou expirado.");
    }

    let email =
      providedEmail ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEYS.EMAIL_FOR_SIGN_IN)
        : null);

    if (!email) {
      throw new Error(
        "EMAIL_REQUIRED: Por favor, informe seu e-mail para confirmar a autenticação."
      );
    }

    email = email.trim().toLowerCase();

    try {
      const userCredential = await signInWithEmailLink(auth, email, currentUrl);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Falha ao autenticar com o link de e-mail.");
      }

      // Limpa storage temporário
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.EMAIL_FOR_SIGN_IN);
      }

      // Sincroniza e retorna o perfil completo do cliente
      return await firebaseAuthService.fetchOrSyncUserProfile(user);
    } catch (error: any) {
      console.error("Erro ao concluir login por link:", error);
      if (error.code === "auth/invalid-action-code") {
        throw new Error("Este link de acesso já foi utilizado ou expirou.");
      }
      throw error;
    }
  },

  /**
   * Helper para verificar se a URL atual contém um link de autenticação por e-mail do Firebase
   */
  isAuthEmailLink(url?: string): boolean {
    const targetUrl =
      url || (typeof window !== "undefined" ? window.location.href : "");
    return isSignInWithEmailLink(auth, targetUrl);
  },
};
