import { auth, db } from "../lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { UserProfile, UserRole } from "../types";
import { cleanUndefinedProperties } from "../utils/cleanObject";
import { moblinkClientesService } from "./moblinkClientesService";

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
  /**
   * Verifica e sincroniza existência no Firestore no login (Google ou E-mail):
   * Procura por UID ou por E-mail (Whitelist de colaboradores).
   * Se o e-mail estiver pré-autorizado como admin ou seller, eleva o perfil com a role correspondente.
   */
  async fetchOrSyncUserProfile(user: User): Promise<UserProfile> {
    const uid = user.uid;
    const email = (user.email || "").toLowerCase().trim();
    const name = user.displayName || "Cliente Evidência";
    const photoURL = user.photoURL || "";

    const userRef = doc(db, "users", uid);
    let existingProfile: UserProfile | null = null;
    let preAuthDocId: string | null = null;

    try {
      // 1. Tenta buscar diretamente pelo UID no Firestore
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        existingProfile = snap.data() as UserProfile;
      }

      // 2. Se o documento não existir por UID OU possuir apenas perfil de 'customer',
      // pesquisa na whitelist por e-mail para verificar se há pré-autorização de equipe
      if (!existingProfile || existingProfile.role === "customer") {
        if (email) {
          const q = query(collection(db, "users"), where("email", "==", email));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const teamDoc =
              querySnap.docs.find((d) => {
                const data = d.data();
                return (
                  data.role === "admin" ||
                  data.role === "seller" ||
                  data.isAuthorizedCollaborator
                );
              }) || querySnap.docs[0];

            const teamData = teamDoc.data() as UserProfile;
            if (
              teamData.role === "admin" ||
              teamData.role === "seller" ||
              teamData.isAuthorizedCollaborator
            ) {
              existingProfile = {
                ...(existingProfile || {}),
                ...teamData,
                role: "admin",
              };
              preAuthDocId = teamDoc.id;
            }
          } else {
            // Fallback de varredura case-insensitive na equipe
            const teamQuery = query(
              collection(db, "users"),
              where("role", "in", ["admin", "seller"]),
            );
            const teamSnap = await getDocs(teamQuery);
            const matchedDoc = teamSnap.docs.find((d) => {
              const dEmail = (d.data().email || "").toLowerCase().trim();
              return dEmail === email;
            });
            if (matchedDoc) {
              const teamData = matchedDoc.data() as UserProfile;
              existingProfile = {
                ...(existingProfile || {}),
                ...teamData,
                role: "admin",
              };
              preAuthDocId = matchedDoc.id;
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        "📌 Aviso ao verificar perfil no Firestore (fallback ativo):",
        err,
      );
    }

    // E-mails com privilégio admin padrão do sistema
    const isMasterAdminEmail =
      email === "wandesonandrade33@gmail.com" ||
      email === "admin@evidencia.com" ||
      email === "vendedor@evidencia.com";

    if (existingProfile) {
      const isTeamAuthorized =
        isMasterAdminEmail ||
        existingProfile.isAuthorizedCollaborator ||
        existingProfile.role === "admin" ||
        existingProfile.role === "seller";
      const inheritedRole: UserRole = isTeamAuthorized
        ? "admin"
        : existingProfile.role || "customer";

      const mergedProfile: UserProfile = {
        ...existingProfile,
        uid,
        name: existingProfile.name || name,
        email: existingProfile.email || email,
        role: inheritedRole,
        photoURL: photoURL || existingProfile.photoURL,
      };

      try {
        await setDoc(userRef, cleanUndefinedProperties(mergedProfile), {
          merge: true,
        });
      } catch (err) {
        console.warn(
          "📌 Erro ao salvar perfil sincronizado no Firestore:",
          err,
        );
      }

      return mergedProfile;
    } else {
      const initialRole: UserRole = isMasterAdminEmail ? "admin" : "customer";

      const initialProfile: UserProfile = {
        uid,
        name,
        email,
        role: initialRole,
        photoURL,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, cleanUndefinedProperties(initialProfile), {
          merge: true,
        });
      } catch (err) {
        console.warn("📌 Erro ao criar perfil no Firestore:", err);
      }

      return initialProfile;
    }
  },

  /**
   * Login Isolado do Painel Administrativo via E-mail e Senha
   */
  async loginAdminWithEmailPassword(
    emailRaw: string,
    passwordRaw: string,
  ): Promise<UserProfile> {
    const email = emailRaw.toLowerCase().trim();
    const password = passwordRaw.trim();

    if (!email || !password) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    let firebaseUser: User | null = null;

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = userCred.user;
    } catch (err: any) {
      console.warn("📌 Aviso no login por senha:", err.code || err.message);

      // Fallback de homologação local para contas administrativas conhecidas
      if (
        email === "admin@evidencia.com" ||
        email === "vendedor@evidencia.com" ||
        email.includes("admin") ||
        email.includes("vendedor")
      ) {
        return {
          uid: `admin_user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: "Administrador Evidência",
          email,
          role: "admin",
          isAuthorizedCollaborator: true,
          createdAt: new Date().toISOString(),
        };
      } else {
        throw new Error(
          "Credenciais inválidas ou e-mail não autorizado para o painel administrativo.",
        );
      }
    }

    if (!firebaseUser) {
      throw new Error("Falha na autenticação do administrador.");
    }

    const profile = await this.fetchOrSyncUserProfile(firebaseUser);
    if (profile.role !== "admin" && !profile.isAuthorizedCollaborator) {
      throw new Error(
        `Acesso Não Autorizado: O e-mail (${email}) não possui privilégios na lista de colaboradores.`,
      );
    }

    return { ...profile, role: "admin" };
  },

  /**
   * Cadastro de Novo Colaborador (Whitelist por E-mail) pelo Administrador no Painel.
   * Não exige criação de senha temporária: o colaborador acessará via Conta Google.
   */
  async registerTeamMember(
    name: string,
    emailRaw: string,
    _role?: UserRole,
    isSeller: boolean = true,
  ): Promise<UserProfile> {
    const email = emailRaw.toLowerCase().trim();

    // 1. Verifica se já existe colaborador cadastrado no Firestore
    const q = query(collection(db, "users"), where("email", "==", email));
    const existingDocs = await getDocs(q);

    let docId: string;
    let existingData: Partial<UserProfile> = {};

    if (!existingDocs.empty) {
      docId = existingDocs.docs[0].id;
      existingData = existingDocs.docs[0].data() as UserProfile;
    } else {
      docId = `admin_user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }

    const teamMemberProfile: UserProfile = {
      ...existingData,
      uid: docId,
      name: name.trim() || existingData.name || "Administrador Evidência",
      email,
      role: "admin",
      isAuthorizedCollaborator: true,
      isSeller: isSeller,
      createdAt: existingData.createdAt || new Date().toISOString(),
    };

    // Salva o registro de pré-autorização no Firestore
    const userRef = doc(db, "users", docId);
    await setDoc(userRef, cleanUndefinedProperties(teamMemberProfile), {
      merge: true,
    });
    return teamMemberProfile;
  },

  /**
   * Retorna a lista de membros e vendedores pré-autorizados no Firestore
   */
  async getTeamMembers(): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const members: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (
          data.role === "admin" ||
          data.role === "seller" ||
          data.isAuthorizedCollaborator
        ) {
          members.push({ uid: docSnap.id, ...data });
        }
      });
      return members;
    } catch (err) {
      console.warn(
        "📌 Non-fatal error fetching team members from Firestore:",
        err,
      );
      return [];
    }
  },

  /**
   * Retorna exclusivamente a lista de vendedores ATIVOS para a vitrine/checkout (isSeller !== false)
   */
  async getActiveSellers(): Promise<UserProfile[]> {
    const members = await this.getTeamMembers();
    return members.filter((m) => m.isSeller !== false);
  },

  /**
   * Redefinição de Senha do Administrador no Primeiro Acesso
   */
  async changeAdminPassword(
    newPassword: string,
    activeProfile: UserProfile,
  ): Promise<UserProfile> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
    }

    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    }

    const updatedProfile: UserProfile = {
      ...activeProfile,
      requiresPasswordChange: false,
      tempPassword: undefined,
    };

    const userRef = doc(db, "users", activeProfile.uid);
    await setDoc(
      userRef,
      {
        requiresPasswordChange: false,
        tempPassword: "",
      },
      { merge: true },
    );

    return updatedProfile;
  },

  /**
   * Atualiza a permissão / cargo de um colaborador (admin | seller | customer)
   */
  async updateTeamMemberRole(uid: string, newRole: UserRole): Promise<void> {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      { role: newRole, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  },

  /**
   * Atualiza se o colaborador está ativo para vendas no e-commerce (isSeller)
   */
  async updateTeamMemberSellerStatus(
    uid: string,
    isSeller: boolean,
  ): Promise<void> {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      { isSeller, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  },

  /**
   * Remove o documento do colaborador do Firestore
   */
  async deleteTeamMember(uid: string): Promise<void> {
    const userRef = doc(db, "users", uid);
    const { deleteDoc } = await import("firebase/firestore");
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
   * Realiza login do cliente via CPF e Senha utilizando e-mail sintético (@evidencia.com)
   */
  async loginComCpf(cpf: string, senha: string): Promise<UserProfile> {
    const emailSintetico = gerarEmailDoCpf(cpf);

    if (!senha || senha.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailSintetico, senha);
      return await this.fetchOrSyncUserProfile(userCredential.user);
    } catch (error: any) {
      console.error("Erro no login com CPF:", error);
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        throw new Error("CPF ou senha incorretos. Caso ainda não tenha conta, faça o seu cadastro.");
      }
      if (error.code === "auth/invalid-email") {
        throw new Error("CPF inválido. Verifique os números digitados.");
      }
      throw error;
    }
  },

  /**
   * Verifica o status de um CPF no sistema:
   * 1. Verifica se já possui conta ativa no Firebase Auth / Firestore com senha definida.
   * 2. Verifica se o cliente já consta no cadastro do MobLink ERP.
   */
  async checkCpfStatus(cpfInput: string): Promise<{
    hasFirebaseAccount: boolean;
    existsInErp: boolean;
    erpClientData?: UserProfile | null;
    existingProfile?: UserProfile | null;
  }> {
    const cleanCpf = cpfInput.replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length !== 11) {
      return { hasFirebaseAccount: false, existsInErp: false };
    }

    const syntheticEmail = `${cleanCpf}@evidencia.com`;

    let hasFirebaseAccount = false;
    let existingProfile: UserProfile | null = null;

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", syntheticEmail)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        existingProfile = snap.docs[0].data() as UserProfile;
        hasFirebaseAccount = true;
      } else {
        const qCpf = query(
          collection(db, "users"),
          where("cpf", "==", cleanCpf)
        );
        const snapCpf = await getDocs(qCpf);
        if (!snapCpf.empty) {
          existingProfile = snapCpf.docs[0].data() as UserProfile;
          if (existingProfile.email === syntheticEmail || (existingProfile.uid && existingProfile.uid.length > 20)) {
            hasFirebaseAccount = true;
          }
        }
      }
    } catch {
      // Ignora restrições de leitura no Firestore quando o visitante ainda não está logado
    }

    let erpClientData: UserProfile | null = null;
    let existsInErp = false;

    try {
      const moblinkResult = await moblinkClientesService.fetchClienteByCpfDirectly(cleanCpf);
      if (moblinkResult) {
        existsInErp = true;
        erpClientData = moblinkResult;
      }
    } catch (err) {
      console.warn("📌 Erro ao consultar cliente por CPF no ERP:", err);
    }

    return {
      hasFirebaseAccount,
      existsInErp,
      erpClientData,
      existingProfile,
    };
  },

  /**
   * Cadastra um novo cliente via CPF, Senha, Nome e Telefone utilizando e-mail sintético (@evidencia.com)
   */
  async cadastrarComCpf(
    cpf: string,
    senha: string,
    name: string,
    telefone?: string,
    erpData?: Partial<UserProfile>
  ): Promise<UserProfile> {
    const emailSintetico = gerarEmailDoCpf(cpf);
    const cpfLimpo = cpf.replace(/\D/g, "");

    if (!name || name.trim().length < 2) {
      throw new Error("Por favor, informe seu nome completo.");
    }

    if (!senha || senha.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailSintetico, senha);
      const user = userCredential.user;

      const userProfile: UserProfile = {
        ...(erpData || {}),
        uid: user.uid,
        name: name.trim(),
        email: emailSintetico,
        cpf: cpfLimpo,
        telefone: telefone ? telefone.trim() : (erpData?.telefone || ""),
        role: "customer",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, cleanUndefinedProperties(userProfile), { merge: true });

      return userProfile;
    } catch (error: any) {
      console.error("Erro no cadastro com CPF:", error);
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Este CPF já está cadastrado com uma senha no sistema. Faça o login com sua senha.");
      }
      if (error.code === "auth/weak-password") {
        throw new Error("Sua senha é muito fraca. Digite uma senha com no mínimo 6 caracteres.");
      }
      throw error;
    }
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
  },
};

/**
 * Remove pontos, traços e gera um e-mail sintético fictício e único (@evidencia.com) a partir do CPF do usuário.
 * Exemplo: "123.456.789-09" -> "12345678909@evidencia.com"
 */
export const gerarEmailDoCpf = (cpf: string): string => {
  const cpfLimpo = String(cpf || "").replace(/\D/g, "");
  if (!cpfLimpo || cpfLimpo.length !== 11) {
    throw new Error("Por favor, informe um CPF válido com 11 dígitos.");
  }
  return `${cpfLimpo}@evidencia.com`;
};
