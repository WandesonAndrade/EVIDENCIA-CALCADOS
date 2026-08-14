import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { UserProfile } from "../types";
import { cleanUndefinedProperties } from "../utils/cleanObject";
import { evidenciaAuthService } from "../lib/evidenciaAuth";
import { API_ENDPOINTS } from "./api";
import { parseValor } from "../utils/numberUtils";

export const MOBLINK_CLIENTES_API_URL = API_ENDPOINTS.CLIENTES;

export interface MoblinkRawClient {
  id: string;
  nome: string;
  nome_fantasia?: string | null;
  apelido?: string | null;
  pessoa?: string;
  status?: string;
  ativo?: boolean;
  data_cad?: string;
  data_atu?: string | null;
  id_loja?: string;
  cpf_cnpj?: string | null;
  rg?: string | null;
  endereco?: string | null;
  numero_end?: string | null;
  complemento_end?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
  data_nasc?: string | null;
  sexo?: string | null;
  consumidor?: boolean;
  sit_cred?: string | null;
  limite_cred?: number | null;
  valor_vencido?: number | null;
  valor_vencer?: number | null;
  foto_uri?: string | null;
}

export interface MoblinkClientesPageResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: MoblinkRawClient[];
}

export const moblinkClientesService = {
  /**
   * Busca uma página de clientes na API oficial do MobLink ERP
   */
  async fetchClientesFromMoblinkApi(
    page: number = 1,
  ): Promise<MoblinkClientesPageResponse> {
    const response = await evidenciaAuthService.fetchWithAuth(
      `${MOBLINK_CLIENTES_API_URL}?page=${page}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Falha ao consultar API de Clientes MobLink (HTTP ${response.status})`,
      );
    }

    return await response.json();
  },

  /**
   * Busca cliente diretamente por CPF/CNPJ na API oficial do MobLink ERP
   */
  async fetchClienteByCpfDirectly(
    cleanCpf: string,
  ): Promise<UserProfile | null> {
    if (!cleanCpf || cleanCpf.length < 11) return null;

    try {
      const response = await evidenciaAuthService.fetchWithAuth(
        `${MOBLINK_CLIENTES_API_URL}?cpf_cnpj=${cleanCpf}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      );

      if (response.ok) {
        const json: MoblinkClientesPageResponse = await response.json();
        if (json && json.data && json.data.length > 0) {
          const rawClient = json.data[0];
          return moblinkClientesService.mapRawClientToUserProfile(rawClient);
        }
      }
    } catch {
      // Silencioso se houver restrição
    }

    return null;
  },

  /**
   * Mapeia em memória um cliente do ERP MobLink para o formato UserProfile (sem escrita no Firestore)
   */
  mapRawClientToUserProfile(client: MoblinkRawClient): UserProfile {
    const rawCpf = client.cpf_cnpj ? client.cpf_cnpj.replace(/\D/g, "") : "";
    const docId = rawCpf.length === 11 ? `erp_cpf_${rawCpf}` : `moblink_client_${client.id}`;

    const hasCreditApproved = Boolean(
      (client.sit_cred &&
        (client.sit_cred === "A" ||
          client.sit_cred === "L" ||
          client.sit_cred === "N")) ||
      (client.limite_cred && client.limite_cred > 0),
    );

    return {
      uid: docId,
      moblinkId: String(client.id),
      name: client.nome || "Cliente Evidência",
      email: (client.email || "").toLowerCase().trim(),
      cpf: rawCpf,
      rg: client.rg || "",
      telefone: client.celular || client.telefone || "",
      endereco: client.endereco || "",
      numero: client.numero_end || "",
      bairro: client.bairro || "",
      cidade: client.cidade || "Caxias",
      uf: (client.uf || "MA").toUpperCase(),
      cep: client.cep || "",
      dataNascimento: client.data_nasc || "",
      role: "customer",
      isErpCustomer: true,
      isProfileComplete: true,
      sit_cred: client.sit_cred || "N",
      limite_cred: client.limite_cred || 0,
      valor_vencido: client.valor_vencido || 0,
      valor_vencer: client.valor_vencer || 0,
      solicitarCrediario: hasCreditApproved,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Busca todas as páginas de clientes da API do MobLink ERP
   */
  async fetchAllClientes(): Promise<MoblinkRawClient[]> {
    const firstPage = await moblinkClientesService.fetchClientesFromMoblinkApi(1);
    let allClients: MoblinkRawClient[] = [...(firstPage.data || [])];
    const totalPages = firstPage.lastPage || 1;

    if (totalPages > 1) {
      for (let p = 2; p <= Math.min(totalPages, 50); p++) {
        try {
          const nextPage = await moblinkClientesService.fetchClientesFromMoblinkApi(p);
          if (nextPage.data && nextPage.data.length > 0) {
            allClients = allClients.concat(nextPage.data);
          }
        } catch (err) {
          console.warn(`Erro ao buscar página ${p} de clientes MobLink:`, err);
        }
      }
    }

    return allClients;
  },

  /**
   * Mapeia e salva um único cliente do ERP no Firestore
   */
  async saveSingleClientToFirestore(
    client: MoblinkRawClient,
  ): Promise<UserProfile> {
    const rawCpf = client.cpf_cnpj ? client.cpf_cnpj.replace(/\D/g, "") : "";

    const docId =
      rawCpf.length === 11
        ? `erp_cpf_${rawCpf}`
        : `moblink_client_${client.id}`;

    const userRef = doc(db, "users", docId);
    const existingSnap = await getDoc(userRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as Partial<UserProfile>)
      : null;

    const hasCreditApproved = Boolean(
      (client.sit_cred &&
        (client.sit_cred === "A" ||
          client.sit_cred === "L" ||
          client.sit_cred === "N")) ||
      (client.limite_cred && client.limite_cred > 0),
    );

    const mappedProfile: Partial<UserProfile> = {
      uid: existingData?.uid || docId,
      moblinkId: String(client.id),
      name: client.nome || existingData?.name || "Cliente Evidência",
      email: (client.email || existingData?.email || "").toLowerCase().trim(),
      cpf: rawCpf || existingData?.cpf || "",
      rg: client.rg || existingData?.rg || "",
      telefone:
        client.celular || client.telefone || existingData?.telefone || "",
      endereco: client.endereco || existingData?.endereco || "",
      numero: client.numero_end || existingData?.numero || "",
      bairro: client.bairro || existingData?.bairro || "",
      cidade: client.cidade || existingData?.cidade || "Caxias",
      uf: (client.uf || existingData?.uf || "MA").toUpperCase(),
      cep: client.cep || existingData?.cep || "",
      dataNascimento: client.data_nasc || existingData?.dataNascimento || "",
      role: existingData?.role || "customer",
      isErpCustomer: true,
      isProfileComplete: true,
      sit_cred: client.sit_cred || "N",
      limite_cred: client.limite_cred || 0,
      valor_vencido: client.valor_vencido || 0,
      valor_vencer: client.valor_vencer || 0,
      solicitarCrediario: hasCreditApproved
        ? true
        : existingData?.solicitarCrediario,
      crediarioStatus: hasCreditApproved
        ? "Aprovado"
        : existingData?.crediarioStatus || "NaoSolicitado",
      createdAt:
        existingData?.createdAt || client.data_cad || new Date().toISOString(),
    };

    const payload = cleanUndefinedProperties({ ...client, ...mappedProfile });
    await setDoc(userRef, payload, { merge: true });
    return { ...client, ...mappedProfile } as UserProfile;
  },

  /**
   * Sincroniza e importa todos os clientes do MobLink ERP para o Firestore
   */
  async syncClientesToFirestore(
    onProgress?: (current: number, total: number, message: string) => void,
  ): Promise<{ imported: number; updated: number; errors: number }> {
    if (onProgress) onProgress(0, 0, "Conectando à API do MobLink ERP...");

    const rawClients = await moblinkClientesService.fetchAllClientes();
    const total = rawClients.length;
    let imported = 0;
    let updated = 0;
    let errors = 0;

    if (onProgress)
      onProgress(
        0,
        total,
        `Processando ${total} clientes importados do ERP...`,
      );

    for (let i = 0; i < rawClients.length; i++) {
      const client = rawClients[i];

      try {
        await moblinkClientesService.saveSingleClientToFirestore(client);
        imported++;
      } catch (err) {
        console.error(
          `Erro ao salvar cliente ${client.nome} (${client.id}) no Firestore:`,
          err,
        );
        errors++;
      }

      if (onProgress && i % 10 === 0) {
        onProgress(
          i + 1,
          total,
          `Sincronizados ${i + 1} de ${total} clientes...`,
        );
      }
    }

    if (onProgress)
      onProgress(
        total,
        total,
        `Concluído! ${imported} clientes sincronizados no banco de dados.`,
      );
    return { imported, updated, errors };
  },

  /**
   * Consulta instantânea por CPF do cliente:
   * 1. Firestore local
   * 2. Fallback direto para a API do MobLink ERP com auto-save no Firestore
   */
  async findClientByCpf(cpfInput: string): Promise<UserProfile | null> {
    const cleanCpf = cpfInput.replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length < 11) return null;

    try {
      // 1. Tenta buscar direto pela chave erp_cpf_{cleanCpf}
      const directRef = doc(db, "users", `erp_cpf_${cleanCpf}`);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return directSnap.data() as UserProfile;
      }

      // 2. Tenta consultar a coleção 'users' onde cpf == cleanCpf ou cpf == cpfInput
      const q1 = query(collection(db, "users"), where("cpf", "==", cleanCpf));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        return snap1.docs[0].data() as UserProfile;
      }

      // 3. Tenta consultar com formatação padrão 000.000.000-00
      const formattedCpf = cleanCpf.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4",
      );
      const q2 = query(
        collection(db, "users"),
        where("cpf", "==", formattedCpf),
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return snap2.docs[0].data() as UserProfile;
      }

      // 4. FALLBACK EM TEMPO REAL: Busca direto na API do MobLink ERP e grava no Firestore!
      console.log(
        `📌 Cliente não encontrado no Firestore local. Consultando API MobLink ERP para CPF ${cleanCpf}...`,
      );
      const erpClient = await moblinkClientesService.fetchClienteByCpfDirectly(cleanCpf);
      if (erpClient) {
        console.log(
          `✅ Cliente ${erpClient.name} localizado no ERP e salvo no Firestore!`,
        );
        return erpClient;
      }
    } catch (err) {
      console.warn("📌 Erro ao buscar cliente por CPF:", err);
    }

    return null;
  },

  async getOrCreateUserFromMoblinkCpf(cpf: string): Promise<UserProfile | null> {
    return moblinkClientesService.findClientByCpf(cpf);
  },

  /**
   * Consulta faturas e contas a receber de um cliente específico no MobLink ERP
   * GET https://api.evidenciacalcados.com.br/api/v1/clientes/{id}/contas-receber?formatada=false&vencidas=false
   */
  async fetchClienteContasReceber(
    moblinkId: string,
  ): Promise<MoblinkContaReceber[]> {
    if (!moblinkId) return [];

    try {
      const url = `${MOBLINK_CLIENTES_API_URL}/${moblinkId}/contas-receber?formatada=false&vencidas=false`;
      const response = await evidenciaAuthService.fetchWithAuth(url, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          `Aviso ao consultar contas a receber para cliente #${moblinkId}: HTTP ${response.status}`,
        );
        return [];
      }

      const resData = await response.json();
      if (Array.isArray(resData)) return resData;
      if (resData && Array.isArray(resData.data)) return resData.data;
      return [];
    } catch (err) {
      console.error(
        `Erro ao consultar contas a receber para cliente #${moblinkId}:`,
        err,
      );
      return [];
    }
  },
};

export interface MoblinkContaReceber {
  id?: string | number;
  id_conta_receber?: string | number | null;
  id_contas_receber?: string | number | null;
  id_duplicata?: string | number | null;
  id_parcela?: string | number | null;
  id_receber?: string | number | null;
  id_lancamento?: string | number | null;
  id_titulo?: string | number | null;
  codigo?: string | number | null;
  id_venda?: string | number | null;
  documento?: string | number | null;
  numero_documento?: string | number | null;
  parcela?: string | number | null;
  nro_parcela?: string | number | null;
  num_parcela?: string | number | null;
  data_vencimento?: string | null;
  vencimento?: string | null;
  data_emissao?: string | null;
  emissao?: string | null;
  valor?: number | null;
  valor_parcela?: number | null;
  valor_pago?: number | null;
  saldo?: number | null;
  saldo_devedor?: number | null;
  valor_juros?: number | null;
  juros?: number | null;
  situacao?: string | null;
  status?: string | null;
  historico?: string | null;
  historico_origem?: string | null;
  loja?: string | null;
}

/**
 * Retorna o ID único ou o identificador exato da parcela vindo da API do MobLink ERP
 */
export function getParcelId(inv: MoblinkContaReceber): string {
  if (inv.id !== undefined && inv.id !== null && String(inv.id).trim() !== "") {
    return String(inv.id).trim();
  }
  if (inv.id_conta_receber !== undefined && inv.id_conta_receber !== null) {
    return String(inv.id_conta_receber).trim();
  }
  if (inv.id_contas_receber !== undefined && inv.id_contas_receber !== null) {
    return String(inv.id_contas_receber).trim();
  }
  if (inv.id_duplicata !== undefined && inv.id_duplicata !== null) {
    return String(inv.id_duplicata).trim();
  }
  if (inv.id_parcela !== undefined && inv.id_parcela !== null) {
    return String(inv.id_parcela).trim();
  }
  if (inv.id_receber !== undefined && inv.id_receber !== null) {
    return String(inv.id_receber).trim();
  }
  if (inv.id_lancamento !== undefined && inv.id_lancamento !== null) {
    return String(inv.id_lancamento).trim();
  }
  if (inv.id_titulo !== undefined && inv.id_titulo !== null) {
    return String(inv.id_titulo).trim();
  }
  if (inv.codigo !== undefined && inv.codigo !== null) {
    return String(inv.codigo).trim();
  }
  
  // Fallback: ID da Venda + Número da Parcela
  const saleId = String(inv.id_venda ?? inv.documento ?? "0").trim();
  const parcNum = String(inv.parcela ?? inv.numero_documento ?? inv.nro_parcela ?? inv.num_parcela ?? "1").trim();
  return `${saleId}_${parcNum}`;
}

/**
 * Calcula o valor atualizado da parcela priorizando o campo `saldo_devedor` (com juros/encargos do ERP)
 */
export function getInstallmentAmount(inv: MoblinkContaReceber): {
  displayAmount: number;
  originalAmount: number;
  hasInterest: boolean;
  interestAmount: number;
  isPaid: boolean;
  isOverdue: boolean;
} {
  const statusRaw = (inv.situacao || inv.status || "Pendente").toUpperCase();
  const isPaid =
    statusRaw.includes("PAG") ||
    statusRaw.includes("BAIX") ||
    statusRaw === "L";
  const isOverdue =
    !isPaid && (statusRaw.includes("VENC") || statusRaw.includes("ATRAS"));

  const originalAmount = parseValor(inv.valor_parcela ?? inv.valor ?? inv.saldo);
  const valorPago = parseValor(inv.valor_pago);

  if (isPaid) {
    return {
      displayAmount: valorPago > 0 ? valorPago : originalAmount,
      originalAmount,
      hasInterest: false,
      interestAmount: 0,
      isPaid,
      isOverdue: false,
    };
  }

  // Prioriza o campo saldo_devedor oficial do ERP MobLink (com juros/encargos aplicados)
  const parsedSaldoDevedor = parseValor(inv.saldo_devedor);
  const parsedSaldo = parseValor(inv.saldo);
  const saldoDevedor = parsedSaldoDevedor > 0 ? parsedSaldoDevedor : (parsedSaldo > 0 ? parsedSaldo : originalAmount);

  // Cálculo de juros/encargos extras
  const explicitJuros = parseValor(inv.juros ?? inv.valor_juros);
  const computedInterest =
    saldoDevedor > originalAmount
      ? saldoDevedor - originalAmount
      : explicitJuros;
  const hasInterest = computedInterest > 0.01;

  return {
    displayAmount: saldoDevedor,
    originalAmount,
    hasInterest,
    interestAmount: computedInterest,
    isPaid,
    isOverdue,
  };
}
