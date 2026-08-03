import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cleanUndefinedProperties } from '../utils/cleanObject';

export const MOBLINK_CLIENTES_API_URL = 'https://api.evidenciacalcados.com.br/api/v1/clientes';
export const MOBLINK_CLIENTES_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiI3IiwiaWRMb2phIjoiMCIsImlhdCI6MTc4NTc3MjQxMCwiZXhwIjoxNzg1ODU4ODEwfQ.B1-GbpQrMFXaPUCpC3AdJVacGwVeTaXL-9zq9zxAyLY';

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
  async fetchClientesPage(page: number = 1): Promise<MoblinkClientesPageResponse> {
    const response = await fetch(`${MOBLINK_CLIENTES_API_URL}?page=${page}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${MOBLINK_CLIENTES_BEARER_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar API de Clientes MobLink (HTTP ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Busca cliente diretamente por CPF/CNPJ na API oficial do MobLink ERP
   */
  async fetchClienteByCpfDirectly(cleanCpf: string): Promise<UserProfile | null> {
    if (!cleanCpf || cleanCpf.length < 11) return null;

    try {
      const response = await fetch(`${MOBLINK_CLIENTES_API_URL}?cpf_cnpj=${cleanCpf}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${MOBLINK_CLIENTES_BEARER_TOKEN}`
        }
      });

      if (response.ok) {
        const json: MoblinkClientesPageResponse = await response.json();
        if (json && json.data && json.data.length > 0) {
          const rawClient = json.data[0];
          return await this.saveSingleClientToFirestore(rawClient);
        }
      }
    } catch (err) {
      console.warn("📌 Erro ao consultar cliente por CPF na API MobLink:", err);
    }

    return null;
  },

  /**
   * Busca todas as páginas de clientes da API do MobLink ERP
   */
  async fetchAllClientes(): Promise<MoblinkRawClient[]> {
    const firstPage = await this.fetchClientesPage(1);
    let allClients: MoblinkRawClient[] = [...(firstPage.data || [])];
    const totalPages = firstPage.lastPage || 1;

    if (totalPages > 1) {
      for (let p = 2; p <= Math.min(totalPages, 50); p++) {
        try {
          const nextPage = await this.fetchClientesPage(p);
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
  async saveSingleClientToFirestore(client: MoblinkRawClient): Promise<UserProfile> {
    const rawCpf = client.cpf_cnpj ? client.cpf_cnpj.replace(/\D/g, '') : '';

    const docId = rawCpf.length === 11 
      ? `erp_cpf_${rawCpf}` 
      : `moblink_client_${client.id}`;

    const userRef = doc(db, 'users', docId);
    const existingSnap = await getDoc(userRef);
    const existingData = existingSnap.exists() ? (existingSnap.data() as Partial<UserProfile>) : null;

    const hasCreditApproved = Boolean(
      (client.sit_cred && (client.sit_cred === 'A' || client.sit_cred === 'L' || client.sit_cred === 'N')) ||
      (client.limite_cred && client.limite_cred > 0)
    );

    const mappedProfile: Partial<UserProfile> = {
      uid: existingData?.uid || docId,
      moblinkId: String(client.id),
      name: client.nome || existingData?.name || 'Cliente Evidência',
      email: (client.email || existingData?.email || '').toLowerCase().trim(),
      cpf: rawCpf || existingData?.cpf || '',
      rg: client.rg || existingData?.rg || '',
      telefone: client.celular || client.telefone || existingData?.telefone || '',
      endereco: client.endereco || existingData?.endereco || '',
      numero: client.numero_end || existingData?.numero || '',
      bairro: client.bairro || existingData?.bairro || '',
      cidade: client.cidade || existingData?.cidade || 'Caxias',
      uf: (client.uf || existingData?.uf || 'MA').toUpperCase(),
      cep: client.cep || existingData?.cep || '',
      dataNascimento: client.data_nasc || existingData?.dataNascimento || '',
      role: existingData?.role || 'customer',
      isErpCustomer: true,
      isProfileComplete: true,
      sit_cred: client.sit_cred || 'N',
      limite_cred: client.limite_cred || 0,
      valor_vencido: client.valor_vencido || 0,
      valor_vencer: client.valor_vencer || 0,
      solicitarCrediario: hasCreditApproved ? true : existingData?.solicitarCrediario,
      crediarioStatus: hasCreditApproved ? 'Aprovado' : (existingData?.crediarioStatus || 'NaoSolicitado'),
      createdAt: existingData?.createdAt || client.data_cad || new Date().toISOString()
    };

    const payload = cleanUndefinedProperties(mappedProfile);
    await setDoc(userRef, payload, { merge: true });
    return { ...mappedProfile } as UserProfile;
  },

  /**
   * Sincroniza e importa todos os clientes do MobLink ERP para o Firestore
   */
  async syncClientesToFirestore(
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<{ imported: number; updated: number; errors: number }> {
    if (onProgress) onProgress(0, 0, 'Conectando à API do MobLink ERP...');
    
    const rawClients = await this.fetchAllClientes();
    const total = rawClients.length;
    let imported = 0;
    let updated = 0;
    let errors = 0;

    if (onProgress) onProgress(0, total, `Processando ${total} clientes importados do ERP...`);

    for (let i = 0; i < rawClients.length; i++) {
      const client = rawClients[i];

      try {
        await this.saveSingleClientToFirestore(client);
        imported++;
      } catch (err) {
        console.error(`Erro ao salvar cliente ${client.nome} (${client.id}) no Firestore:`, err);
        errors++;
      }

      if (onProgress && i % 10 === 0) {
        onProgress(i + 1, total, `Sincronizados ${i + 1} de ${total} clientes...`);
      }
    }

    if (onProgress) onProgress(total, total, `Concluído! ${imported} clientes sincronizados no banco de dados.`);
    return { imported, updated, errors };
  },

  /**
   * Consulta instantânea por CPF do cliente:
   * 1. Firestore local
   * 2. Fallback direto para a API do MobLink ERP com auto-save no Firestore
   */
  async findClientByCpf(cpfInput: string): Promise<UserProfile | null> {
    const cleanCpf = cpfInput.replace(/\D/g, '');
    if (!cleanCpf || cleanCpf.length < 11) return null;

    try {
      // 1. Tenta buscar direto pela chave erp_cpf_{cleanCpf}
      const directRef = doc(db, 'users', `erp_cpf_${cleanCpf}`);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return directSnap.data() as UserProfile;
      }

      // 2. Tenta consultar a coleção 'users' onde cpf == cleanCpf ou cpf == cpfInput
      const q1 = query(collection(db, 'users'), where('cpf', '==', cleanCpf));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        return snap1.docs[0].data() as UserProfile;
      }

      // 3. Tenta consultar com formatação padrão 000.000.000-00
      const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const q2 = query(collection(db, 'users'), where('cpf', '==', formattedCpf));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return snap2.docs[0].data() as UserProfile;
      }

      // 4. FALLBACK EM TEMPO REAL: Busca direto na API do MobLink ERP e grava no Firestore!
      console.log(`📌 Cliente não encontrado no Firestore local. Consultando API MobLink ERP para CPF ${cleanCpf}...`);
      const erpClient = await this.fetchClienteByCpfDirectly(cleanCpf);
      if (erpClient) {
        console.log(`✅ Cliente ${erpClient.name} localizado no ERP e salvo no Firestore!`);
        return erpClient;
      }
    } catch (err) {
      console.warn("📌 Erro ao buscar cliente por CPF:", err);
    }

    return null;
  }
};
