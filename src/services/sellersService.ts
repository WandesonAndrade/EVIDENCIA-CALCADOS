import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Seller } from '../types';

export const SELLERS_COLLECTION = 'sellers';
export const SELLERS_LOCAL_STORAGE_KEY = 'evidencia_sellers_cache';

export const DEFAULT_SELLERS: Seller[] = [];

/**
 * Carrega vendedores salvação no localStorage como fallback rápido
 */
export const loadSellersFromLocalStorage = (): Seller[] => {
  if (typeof window === 'undefined') return DEFAULT_SELLERS;
  try {
    const cached = localStorage.getItem(SELLERS_LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('[SellersService] Erro ao carregar vendedores do localStorage:', error);
  }
  return DEFAULT_SELLERS;
};

/**
 * Salva a lista de vendedores no localStorage
 */
export const saveSellersToLocalStorage = (sellers: Seller[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELLERS_LOCAL_STORAGE_KEY, JSON.stringify(sellers));
  } catch (error) {
    console.warn('[SellersService] Erro ao salvar vendedores no localStorage:', error);
  }
};

/**
 * Salva ou atualiza um vendedor no Firestore e no cache local
 */
export const saveSellerToFirestore = async (seller: Seller): Promise<Seller> => {
  const updatedSeller: Seller = {
    ...seller,
    updatedAt: new Date().toISOString(),
    createdAt: seller.createdAt || new Date().toISOString(),
  };

  try {
    const ref = doc(db, SELLERS_COLLECTION, updatedSeller.id);
    await setDoc(ref, updatedSeller, { merge: true });
  } catch (error) {
    console.warn('[SellersService] Firestore sem permissão, mantendo salvamento local:', error);
  }

  // Atualiza cache local
  const currentList = loadSellersFromLocalStorage();
  const index = currentList.findIndex(s => s.id === updatedSeller.id);
  if (index > -1) {
    currentList[index] = updatedSeller;
  } else {
    currentList.unshift(updatedSeller);
  }
  saveSellersToLocalStorage(currentList);

  return updatedSeller;
};

/**
 * Deleta um vendedor do Firestore e do cache local
 */
export const deleteSellerFromFirestore = async (sellerId: string): Promise<void> => {
  try {
    const ref = doc(db, SELLERS_COLLECTION, sellerId);
    await deleteDoc(ref);
  } catch (error) {
    console.warn('[SellersService] Erro ao deletar no Firestore:', error);
  }

  const currentList = loadSellersFromLocalStorage();
  const updated = currentList.filter(s => s.id !== sellerId);
  saveSellersToLocalStorage(updated);
};
