import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cleanUndefinedProperties } from '../../utils/cleanObject';
import { ICreditEvaluation, ICreditOrder } from '../../types';

const EVALUATIONS_COLLECTION = 'creditEvaluations';
const ORDERS_COLLECTION = 'creditOrders';

export const creditService = {
  /**
   * Cria uma nova solicitação de avaliação de crédito pelo cliente
   */
  async requestCreditEvaluation(data: Omit<ICreditEvaluation, 'id' | 'createdAt' | 'status'>): Promise<ICreditEvaluation> {
    const id = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newEvaluation: ICreditEvaluation = {
      id,
      ...data,
      status: 'Pendente',
      createdAt: now,
    };

    const docRef = doc(db, EVALUATIONS_COLLECTION, id);
    await setDoc(docRef, cleanUndefinedProperties(newEvaluation));

    // Também atualiza o status de crediário do usuário para 'EmAnalise'
    if (data.userId) {
      try {
        const userRef = doc(db, 'users', data.userId);
        await setDoc(userRef, cleanUndefinedProperties({
          crediarioStatus: 'EmAnalise',
          crediarioSolicitadoEm: now,
          rendaMensal: data.income || undefined,
          profissao: data.profession || undefined,
          referenciaPessoal: data.referenceContact || undefined,
        }), { merge: true });
      } catch (err) {
        console.warn('Não foi possível atualizar perfil do usuário simultaneamente:', err);
      }
    }

    return newEvaluation;
  },

  /**
   * Busca todas as avaliações de crédito (Painel Admin)
   */
  async getAllCreditEvaluations(): Promise<ICreditEvaluation[]> {
    try {
      const colRef = collection(db, EVALUATIONS_COLLECTION);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ICreditEvaluation));
    } catch (err) {
      console.error('Erro ao buscar avaliações de crédito:', err);
      // Fallback sem ordenação caso o índice ainda esteja em criação
      try {
        const colRef = collection(db, EVALUATIONS_COLLECTION);
        const snapshot = await getDocs(colRef);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ICreditEvaluation));
        return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } catch (fallbackErr) {
        console.error('Erro no fallback de avaliações de crédito:', fallbackErr);
        return [];
      }
    }
  },

  /**
   * Busca as avaliações de crédito de um usuário específico
   */
  async getUserCreditEvaluations(userId: string): Promise<ICreditEvaluation[]> {
    try {
      const colRef = collection(db, EVALUATIONS_COLLECTION);
      const q = query(colRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ICreditEvaluation));
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error('Erro ao buscar avaliações do usuário:', err);
      return [];
    }
  },

  /**
   * Atualiza o status de uma avaliação de crédito (Aprovar ou Rejeitar)
   */
  async updateCreditEvaluationStatus(
    id: string,
    status: 'Aprovado' | 'Rejeitado',
    approvedLimit?: number,
    notes?: string,
    adminName?: string
  ): Promise<void> {
    const docRef = doc(db, EVALUATIONS_COLLECTION, id);
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;

    const now = new Date().toISOString();
    const updates: Partial<ICreditEvaluation> = {
      status,
      analyzedAt: now,
      ...(approvedLimit !== undefined ? { approvedLimit } : {}),
      ...(notes ? { notes } : {}),
      ...(adminName ? { analyzedBy: adminName } : {}),
    };

    await setDoc(docRef, cleanUndefinedProperties(updates), { merge: true });

    // Se tiver userId associado, atualiza o usuário no Firestore
    const targetUserId = existingData?.userId;
    if (targetUserId) {
      try {
        const userRef = doc(db, 'users', targetUserId);
        const userUpdates: any = {
          crediarioStatus: status,
          crediarioAnalisadoEm: now,
          ...(status === 'Aprovado' && approvedLimit ? { limite_cred: approvedLimit } : {}),
          ...(status === 'Rejeitado' && notes ? { crediarioMotivoRejeicao: notes } : {})
        };
        await setDoc(userRef, cleanUndefinedProperties(userUpdates), { merge: true });
      } catch (err) {
        console.warn('Não foi possível sincronizar o status no usuário:', err);
      }
    }
  },

  /**
   * Cria uma solicitação de compra via crediário com snapshot do carrinho
   */
  async createCreditOrder(data: Omit<ICreditOrder, 'id' | 'createdAt' | 'status'>): Promise<ICreditOrder> {
    const id = `cord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newOrder: ICreditOrder = {
      id,
      ...data,
      status: 'Pendente',
      createdAt: now,
    };

    const docRef = doc(db, ORDERS_COLLECTION, id);
    await setDoc(docRef, cleanUndefinedProperties(newOrder));
    return newOrder;
  },

  /**
   * Busca todas as solicitações de compra via crediário (Painel Admin)
   */
  async getAllCreditOrders(): Promise<ICreditOrder[]> {
    try {
      const colRef = collection(db, ORDERS_COLLECTION);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ICreditOrder));
    } catch (err) {
      console.error('Erro ao buscar pedidos de crediário:', err);
      try {
        const colRef = collection(db, ORDERS_COLLECTION);
        const snapshot = await getDocs(colRef);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ICreditOrder));
        return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } catch (fallbackErr) {
        console.error('Erro no fallback de pedidos de crediário:', fallbackErr);
        return [];
      }
    }
  },

  /**
   * Busca as solicitações de compra via crediário de um usuário específico
   */
  async getUserCreditOrders(userId: string): Promise<ICreditOrder[]> {
    try {
      const colRef = collection(db, ORDERS_COLLECTION);
      const q = query(colRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ICreditOrder));
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error('Erro ao buscar pedidos de crediário do usuário:', err);
      return [];
    }
  },

  /**
   * Atualiza o status de uma solicitação de compra via crediário
   */
  async updateCreditOrderStatus(
    id: string,
    status: 'Aprovado' | 'Rejeitado',
    adminNotes?: string,
    adminName?: string
  ): Promise<void> {
    const docRef = doc(db, ORDERS_COLLECTION, id);
    const now = new Date().toISOString();

    const updates: Partial<ICreditOrder> = {
      status,
      analyzedAt: now,
      ...(adminNotes ? { adminNotes } : {}),
      ...(adminName ? { analyzedBy: adminName } : {}),
    };

    await setDoc(docRef, cleanUndefinedProperties(updates), { merge: true });
  }
};
