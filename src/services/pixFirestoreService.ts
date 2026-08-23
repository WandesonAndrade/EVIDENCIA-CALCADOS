import { db } from '../lib/firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where 
} from 'firebase/firestore';
import { getParcelId, MoblinkContaReceber } from './moblinkClientesService';

function isQuotaError(err: any): boolean {
  const msg = err?.message || String(err || '');
  return msg.includes('Quota limit exceeded') || msg.includes('resource-exhausted') || msg.includes('quota');
}

export interface PixTransacaoFirestore {
  id?: string;
  docId: string;
  parcelKey: string;
  payment_id: number | string;
  qr_code: string;
  qr_code_base64: string | null;
  transaction_amount: number;
  status: 'pending' | 'approved' | 'cancelled' | 'expired';
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  descricao: string;
  externalReference?: string;
  createdAt: number;
  expires_at: number;
  expirationDateIso: string;
  audited: boolean;
  auditedBy?: string | null;
  auditedAt?: string | null;
  id_venda?: string | number | null;
  id_parcela?: string | number | null;
  vencimento?: string | null;
  updatedAt: string;
}

const COLLECTION_NAME = 'pix_transacoes';

export const pixFirestoreService = {
  /**
   * Constrói o ID único do documento da parcela no Firestore
   * Chave derivada de ID da Venda + ID da Parcela ou Vencimento
   */
  buildDocId(parcelKey: string, idVenda?: string | number, vencimento?: string, idParcela?: string | number): string {
    if (idVenda && idParcela) {
      const cleanParc = String(idParcela).replace(/[^a-zA-Z0-9]/g, '_');
      return `venda_${idVenda}_parc_${cleanParc}`.toLowerCase();
    }
    if (idVenda && vencimento) {
      const cleanVenc = String(vencimento).replace(/\D/g, '');
      return `venda_${idVenda}_venc_${cleanVenc}`.toLowerCase();
    }
    return String(parcelKey).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  },

  /**
   * Compara a parcela carregada da API do MobLink ERP com as salvas no Firestore.
   * Verifica se qualquer identificador da parcela (ID único da parcela, ID de Venda + Nº Parcela) bate com um Pix aprovado.
   */
  checkIfParcelIsPaidInFirestore(
    inv: MoblinkContaReceber | any,
    approvedPixList: PixTransacaoFirestore[]
  ): boolean {
    if (!inv || !approvedPixList || approvedPixList.length === 0) return false;

    // Extrai o ID principal da parcela da API do MobLink
    const mainParcelId = getParcelId(inv).toLowerCase();
    const saleId = String(inv.id_venda ?? inv.documento ?? '').trim().toLowerCase();
    const parcelNum = String(inv.parcela ?? inv.numero_documento ?? inv.nro_parcela ?? inv.num_parcela ?? '').trim().toLowerCase();

    // Coleta todas as chaves candidatas a ID vindas do objeto da API
    const candidateIds: string[] = [
      mainParcelId,
      String(inv.id || '').trim().toLowerCase(),
      String(inv.id_conta_receber || '').trim().toLowerCase(),
      String(inv.id_contas_receber || '').trim().toLowerCase(),
      String(inv.id_duplicata || '').trim().toLowerCase(),
      String(inv.id_parcela || '').trim().toLowerCase(),
      String(inv.id_receber || '').trim().toLowerCase(),
      String(inv.id_lancamento || '').trim().toLowerCase(),
      String(inv.id_titulo || '').trim().toLowerCase(),
      String(inv.codigo || '').trim().toLowerCase(),
    ].filter(Boolean);

    return approvedPixList.some((pix) => {
      if (pix.status !== 'approved') return false;

      const pixSaleId = String(pix.id_venda || '').trim().toLowerCase();
      const pixParcelId = String(pix.id_parcela || pix.parcelKey || '').trim().toLowerCase();
      const pixExtRef = String(pix.externalReference || '').trim().toLowerCase();
      const pixDesc = String(pix.descricao || '').trim().toLowerCase();
      const pixDocId = String(pix.docId || pix.id || '').trim().toLowerCase();

      // 1. Verificação por qualquer um dos IDs candidatos da parcela
      for (const cand of candidateIds) {
        if (cand && cand.length > 0) {
          if (
            pixDocId.includes(cand) ||
            pixParcelId.includes(cand) ||
            pixExtRef.includes(cand) ||
            pixDesc.includes(cand)
          ) {
            return true;
          }
        }
      }

      // 2. Verificação por ID de Venda + Número da Parcela
      if (saleId && pixSaleId && saleId === pixSaleId) {
        if (parcelNum && (pixParcelId.includes(parcelNum) || pixExtRef.includes(parcelNum) || pixDesc.includes(parcelNum))) {
          return true;
        }
      }

      // 3. Verificação por chaves compostas
      if (saleId && parcelNum) {
        const composite1 = `venda_${saleId}_parc_${parcelNum}`;
        const composite2 = `venda_${saleId}_parcela_${parcelNum}`;
        const composite3 = `${saleId}_${parcelNum}`;
        if (pixDocId.includes(composite1) || pixDocId.includes(composite2) || pixDocId.includes(composite3)) {
          return true;
        }
      }

      return false;
    });
  },

  /**
   * Salva ou atualiza uma transação Pix na coleção `pix_transacoes` do Firestore
   */
  async savePixTransacao(data: Omit<PixTransacaoFirestore, 'docId' | 'updatedAt'> & { docId?: string }): Promise<string> {
    const docId = data.docId || this.buildDocId(data.parcelKey, data.id_venda, data.vencimento);
    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      const payload: PixTransacaoFirestore = {
        ...data,
        docId,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`[Firestore pix_transacoes] Documento '${docId}' salvo com sucesso na coleção pix_transacoes.`);
    } catch (err: any) {
      if (!isQuotaError(err)) {
        console.warn(`[Firestore pix_transacoes Warn] Falha ao salvar no Firestore:`, err?.message || err);
      }
    }
    return docId;
  },

  /**
   * Busca uma transação Pix por parcelKey na coleção `pix_transacoes`
   */
  async getPixTransacaoByParcelKey(parcelKey: string, idVenda?: string | number, vencimento?: string): Promise<PixTransacaoFirestore | null> {
    try {
      const docId = this.buildDocId(parcelKey, idVenda, vencimento);
      const docRef = doc(db, COLLECTION_NAME, docId);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        return snap.data() as PixTransacaoFirestore;
      }
    } catch (err) {
      if (!isQuotaError(err)) {
        console.warn(`[Firestore pix_transacoes Warn] Erro ao consultar documento:`, err);
      }
    }
    return null;
  },

  /**
   * Busca todas as transações Pix na coleção `pix_transacoes`
   */
  async fetchAllPixTransacoes(): Promise<PixTransacaoFirestore[]> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ ...d.data(), id: d.id }) as PixTransacaoFirestore);
    } catch (err) {
      if (!isQuotaError(err)) {
        console.warn(`[Firestore pix_transacoes Warn] Erro ao listar coleção:`, err);
      }
      return [];
    }
  },

  /**
   * Busca apenas as transações Pix APROVADAS (status === 'approved')
   */
  async fetchApprovedPixTransacoes(): Promise<PixTransacaoFirestore[]> {
    try {
      const all = await this.fetchAllPixTransacoes();
      return all.filter(t => t.status === 'approved');
    } catch {
      return [];
    }
  },

  /**
   * Atualiza o status da transação Pix (ex: approved, cancelled, expired)
   */
  async updatePixStatus(docId: string, status: 'pending' | 'approved' | 'cancelled' | 'expired'): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      console.log(`[Firestore pix_transacoes] Status do documento '${docId}' alterado para '${status}'.`);
    } catch (err) {
      console.warn(`[Firestore pix_transacoes Warn] Erro ao atualizar status:`, err);
    }
  },

  /**
   * Atualiza a auditoria do administrador na coleção `pix_transacoes`
   */
  async updateAuditStatus(paymentId: number | string, audited: boolean, auditedBy?: string): Promise<void> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, where('payment_id', '==', Number(paymentId)));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        await updateDoc(docSnap.ref, {
          audited: Boolean(audited),
          auditedBy: audited ? (auditedBy || 'Administrador') : null,
          auditedAt: audited ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Firestore pix_transacoes] Auditoria atualizada para payment_id #${paymentId}.`);
      }
    } catch (err) {
      console.warn(`[Firestore pix_transacoes Warn] Erro ao atualizar auditoria:`, err);
    }
  }
};
