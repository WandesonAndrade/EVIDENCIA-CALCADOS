import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { CartItem, Product } from '../types';

export const userDataService = {
  /**
   * Chave isolada de localStorage para o carrinho por UID
   */
  getCartStorageKey(uid: string | null): string {
    return uid ? `evidencia_cart_${uid}` : 'evidencia_cart_guest';
  },

  /**
   * Chave isolada de localStorage para favoritos por UID
   */
  getFavoritesStorageKey(uid: string | null): string {
    return uid ? `evidencia_favorites_${uid}` : 'evidencia_favorites_guest';
  },

  /**
   * Carrega o carrinho salvo localmente para o UID especificado (sem vazamento cruzado)
   */
  loadLocalCart(uid: string | null): CartItem[] {
    if (typeof localStorage === 'undefined') return [];
    const key = this.getCartStorageKey(uid);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Erro ao carregar carrinho local:", err);
      }
    }
    return [];
  },

  /**
   * Carrega os favoritos salvos localmente para o UID especificado (sem vazamento cruzado)
   */
  loadLocalFavorites(uid: string | null): string[] {
    if (typeof localStorage === 'undefined') return [];
    const key = this.getFavoritesStorageKey(uid);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Erro ao carregar favoritos locais:", err);
      }
    }
    return [];
  },

  /**
   * Salva o carrinho localmente sob a chave isolada por UID
   */
  saveLocalCart(uid: string | null, cart: CartItem[]): void {
    if (typeof localStorage === 'undefined') return;
    const key = this.getCartStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(cart));
  },

  /**
   * Salva os favoritos localmente sob a chave isolada por UID
   */
  saveLocalFavorites(uid: string | null, favorites: string[]): void {
    if (typeof localStorage === 'undefined') return;
    const key = this.getFavoritesStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(favorites));
  },

  /**
   * Limpa o estado local de sessão (usado no logout)
   */
  clearAllLocalUserData(uid?: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (uid) {
      localStorage.removeItem(this.getCartStorageKey(uid));
      localStorage.removeItem(this.getFavoritesStorageKey(uid));
    }
    localStorage.removeItem('evidencia_user');
    localStorage.removeItem('evidencia_cart_guest');
    localStorage.removeItem('evidencia_favorites_guest');
    localStorage.removeItem('evidencia_cart');
    localStorage.removeItem('evidencia_favorites');
    localStorage.removeItem('evidencia_local_orders');
  },


  /**
   * Salva o carrinho no Firestore sob a rota isolada /users/{uid}/cart/active e /users/{uid}
   */
  async syncCartToFirestore(uid: string, cart: CartItem[]): Promise<void> {
    if (!uid) return;

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const lightCartItems = cart.map(i => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      selectedSize: i.selectedSize,
      quantity: i.quantity
    }));

    const userRef = doc(db, 'users', uid);
    const cartSubRef = doc(db, 'users', uid, 'cart', 'active');
    const updatedAt = new Date().toISOString();

    try {
      await setDoc(userRef, {
        cart: lightCartItems,
        cartItems: lightCartItems,
        cartItemsCount: totalCount,
        updatedAt
      }, { merge: true });

      await setDoc(cartSubRef, {
        items: lightCartItems,
        totalCount,
        updatedAt
      }, { merge: true });
    } catch (err) {
      console.warn("📌 Erro na sincronização do carrinho com o Firestore:", err);
    }
  },

  /**
   * Salva favoritos no Firestore sob a rota isolada /users/{uid}/favorites/active e /users/{uid}
   */
  async syncFavoritesToFirestore(uid: string, favorites: string[]): Promise<void> {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const favSubRef = doc(db, 'users', uid, 'favorites', 'active');
    const updatedAt = new Date().toISOString();

    try {
      await setDoc(userRef, {
        favorites,
        favoriteIds: favorites,
        favoriteItemsCount: favorites.length,
        updatedAt
      }, { merge: true });

      await setDoc(favSubRef, {
        favoriteIds: favorites,
        favoriteItemsCount: favorites.length,
        updatedAt
      }, { merge: true });
    } catch (err) {
      console.warn("📌 Erro na sincronização dos favoritos com o Firestore:", err);
    }
  },

  /**
   * Inscreve um listener em tempo real para o documento do usuário em /users/{uid}
   */
  subscribeToUserData(
    uid: string,
    onData: (data: { cart?: CartItem[]; favorites?: string[]; profile?: any }) => void
  ): Unsubscribe {
    const userRef = doc(db, 'users', uid);

    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const rawFavs = data.favorites || data.favoriteIds;
        const favorites = Array.isArray(rawFavs) ? rawFavs : undefined;

        onData({
          favorites,
          profile: data
        });
      }
    }, (err) => {
      console.warn("📌 Ouvinte de dados em tempo real do usuário emitiu alerta (usando dados em cache):", err.message);
    });
  }
};


