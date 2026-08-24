import { moblinkClientesService } from "./moblinkClientesService";
import { firebaseAuthService } from "./firebaseAuthService";
import { UserProfile } from "../types";

/**
 * Utilitário para mascarar o nome do cliente no Primeiro Acesso sem vazar PII
 * Exemplo: "MARIA SILVA SANTOS" -> "M**** S**** S****"
 */
export function maskClientName(fullName: string): string {
  if (!fullName || !fullName.trim()) return "Cliente Evidência";
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 2) return part;
      return `${part[0]}${"*".repeat(Math.min(4, part.length - 1))}`;
    })
    .join(" ");
}

/**
 * Utilitário para normalizar datas de nascimento no formato DD/MM/YYYY ou YYYY-MM-DD
 */
export function normalizeDobString(dobStr?: string | null): string {
  if (!dobStr || typeof dobStr !== "string") return "";
  const clean = dobStr.trim().split("T")[0];
  const parts = clean.split(/[-/]/);
  
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD/MM/YYYY
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, "0");
      const dd = parts[2].padStart(2, "0");
      return `${dd}/${mm}/${yyyy}`;
    } else {
      // DD/MM/YYYY
      const dd = parts[0].padStart(2, "0");
      const mm = parts[1].padStart(2, "0");
      const yyyy = parts[2];
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  
  return clean;
}

// Armazenamento em memória para controle de tentativas por CPF (Rate Limiting contra Força Bruta)
const failedAttemptsMap: Map<string, { count: number; lockedUntil: number }> = new Map();

export const firstAccessAuthService = {
  /**
   * Passo 1: Consulta segura se o CPF existe no MobLink ERP
   * Retorna APENAS dados mascarados (sem vazar PII no navegador)
   */
  async checkMoblinkCpfStatus(cpfInput: string): Promise<{
    found: boolean;
    maskedName?: string;
    rawClientName?: string;
    hasBirthDate?: boolean;
    locked?: boolean;
    lockMessage?: string;
  }> {
    const cleanCpf = cpfInput.replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length !== 11) {
      throw new Error("Por favor, digite um CPF válido contendo 11 dígitos.");
    }

    // Checagem de Rate Limiting por CPF
    const attemptRecord = failedAttemptsMap.get(cleanCpf);
    if (attemptRecord && attemptRecord.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 60000);
      return {
        found: false,
        locked: true,
        lockMessage: `Múltiplas tentativas incorretas. Por segurança, aguarde ${remainingMinutes} minuto(s) para tentar novamente.`,
      };
    }

    // Consulta direta na API oficial do MobLink ERP (0 Firebase)
    const erpClient = await moblinkClientesService.fetchClienteByCpfDirectly(cleanCpf);

    if (!erpClient) {
      return { found: false };
    }

    const maskedName = maskClientName(erpClient.name);
    const hasBirthDate = Boolean(erpClient.dataNascimento && erpClient.dataNascimento.trim());

    return {
      found: true,
      maskedName,
      rawClientName: erpClient.name,
      hasBirthDate,
    };
  },

  /**
   * Passo 2 & 3: Valida a Data de Nascimento contra o MobLink ERP e cria a conta com a senha no Firebase Auth
   */
  async validateDobAndCreateAccount(
    cpfInput: string,
    inputDob: string,
    newPassword: string,
  ): Promise<UserProfile> {
    const cleanCpf = cpfInput.replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length !== 11) {
      throw new Error("CPF inválido.");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("A senha de acesso deve conter no mínimo 6 caracteres.");
    }

    // Verifica bloqueio temporário por tentativas incorretas
    const attemptRecord = failedAttemptsMap.get(cleanCpf);
    if (attemptRecord && attemptRecord.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 60000);
      throw new Error(
        `Por razões de segurança, o acesso para este CPF está suspenso. Tente novamente em ${remainingMinutes} minuto(s).`
      );
    }

    // Busca dados do cliente no MobLink ERP
    const erpClient = await moblinkClientesService.fetchClienteByCpfDirectly(cleanCpf);
    if (!erpClient) {
      throw new Error("Cadastro não localizado no MobLink ERP. Verifique o CPF digitado.");
    }

    // Validação da Data de Nascimento
    const normalizedInputDob = normalizeDobString(inputDob);
    const normalizedErpDob = normalizeDobString(erpClient.dataNascimento);

    if (!normalizedErpDob) {
      throw new Error("Seu cadastro da loja física necessita de atualização de data de nascimento. Entre em contato com a loja.");
    }

    if (normalizedInputDob !== normalizedErpDob) {
      const currentFailures = (attemptRecord?.count || 0) + 1;
      if (currentFailures >= 3) {
        // Bloqueia por 30 minutos após 3 falhas seguidas
        failedAttemptsMap.set(cleanCpf, {
          count: currentFailures,
          lockedUntil: Date.now() + 30 * 60 * 1000,
        });
        throw new Error("Data de nascimento incorreta. Limite de 3 tentativas atingido! Bloqueado por 30 minutos.");
      } else {
        failedAttemptsMap.set(cleanCpf, { count: currentFailures, lockedUntil: 0 });
        throw new Error(`Data de nascimento incorreta. Tentativa ${currentFailures} de 3.`);
      }
    }

    // Sucesso na validação! Limpa o histórico de falhas
    failedAttemptsMap.delete(cleanCpf);

    // Cria a conta no Firebase Auth e vincula ao perfil do MobLink ERP
    const createdUser = await firebaseAuthService.cadastrarComCpf(
      cleanCpf,
      newPassword,
      erpClient.name,
      erpClient.telefone
    );

    return {
      ...createdUser,
      ...erpClient,
      uid: createdUser.uid,
      name: erpClient.name || createdUser.name,
      cpf: cleanCpf,
      isErpCustomer: true,
    };
  },
};
