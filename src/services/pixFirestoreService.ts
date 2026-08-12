import { db } from '../lib/firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where 
} from 'firebase/firestore';

export interface PixTransacaoFirestore {
  id?: string;
  docId: string;
  parcelKey: string;
  payment_id: number;
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
  vencimento?: string | null;
  updatedAt: string;
}

const COLLECTION_NAME = 'pix_transacoes';

export const pixFirestoreService = {
  /**
   * Constrói o ID único do documento da parcela no Firestore
   * Chave derivada de ID da Venda + Vencimento ou parcelKey
   */
  buildDocId(parcelKey: string, idVenda?: string | number, vencimento?: string): string {
    if (idVenda && vencimento) {
      const cleanVenc = String(vencimento).replace(/\D/g, '');
      return `venda_${idVenda}_venc_${cleanVenc}`.toLowerCase();
    }
    return String(parcelKey).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  },

  /**
   * Salva ou atualiza uma transação Pix na coleção `pix_transacoes` do Firestore
   */
  async savePixTransacao(data: Omit<PixTransacaoFirestore, 'docId' | 'updatedAt'> & { docId?: string }): Promise<string> {
    const docId = data.docId || this.buildDocId(data.parcelKey, data.id_venda, data.vencimento);
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    const payload: PixTransacaoFirestore = {
      ...data,
      docId,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, payload, { merge: true });
    console.log(`[Firestore pix_transacoes] Documento '${docId}' salvo com sucesso na coleção pix_transacoes.`);
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
      console.warn(`[Firestore pix_transacoes Warn] Erro ao consultar documento:`, err);
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
      console.warn(`[Firestore pix_transacoes Warn] Erro ao listar coleção:`, err);
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
