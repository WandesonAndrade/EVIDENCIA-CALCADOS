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
   * Carrega o carrinho salvo localmente para o UID especificado (sem vazamento cruzado).
   * Suporta tanto o formato slim (novo) quanto o formato legado com produto completo.
   */
  loadLocalCart(uid: string | null): CartItem[] {
    if (typeof localStorage === 'undefined') return [];
    const key = this.getCartStorageKey(uid);
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return [];

      // Detecta formato slim (novo): tem productId mas não tem product
      if (parsed[0] && 'productId' in parsed[0] && !('product' in parsed[0])) {
        // Retorna um CartItem parcial com produto mínimo para exibição inicial
        // O AppContext irá reidratar com o produto completo do catálogo
        return parsed.map((slim: any) => ({
          product: {
            id: slim.productId,
            name: slim.name || '',
            price: slim.price || 0,
            originalPrice: slim.originalPrice,
            images: slim.image ? [slim.image] : [],
            foto_uri: slim.image || '',
            // Campos obrigatórios do tipo Product com valores padrão
            description: '',
            category: '',
            sizes: [],
            crediarioProprio: false,
            visible: true,
            stockControl: false,
            stock: 0,
          } as any,
          selectedSize: slim.selectedSize,
          quantity: slim.quantity || 1,
        }));
      }

      // Formato legado: produto completo
      return parsed as CartItem[];
    } catch (err) {
      console.error("Erro ao carregar carrinho local:", err);
      return [];
    }
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
   * Formato slim salvo no localStorage para evitar QuotaExceededError.
   * Apenas os campos necessários para exibir o carrinho e reidratar com o catálogo.
   */
  serializeCartSlim(cart: CartItem[]): string {
    const slim = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      originalPrice: item.product.originalPrice,
      image: item.product.images?.[0] || item.product.foto_uri || '',
      selectedSize: item.selectedSize,
      quantity: item.quantity,
    }));
    return JSON.stringify(slim);
  },

  /**
   * Salva o carrinho localmente sob a chave isolada por UID.
   * Usa formato slim para evitar QuotaExceededError.
   */
  saveLocalCart(uid: string | null, cart: CartItem[]): void {
    if (typeof localStorage === 'undefined') return;
    const key = this.getCartStorageKey(uid);
    try {
      localStorage.setItem(key, this.serializeCartSlim(cart));
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        console.warn('📌 [Cart] localStorage cheio. Limpando chaves obsoletas e tentando novamente...');
        // Limpa chaves de outros usuários / legadas que podem ter sobrado
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (k.startsWith('evidencia_cart_') && k !== key) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        try {
          localStorage.setItem(key, this.serializeCartSlim(cart));
        } catch {
          // Falha silenciosa — Firestore já persiste o carrinho
          console.warn('📌 [Cart] Não foi possível salvar no localStorage mesmo após limpeza. Usando apenas Firestore.');
        }
      }
    }
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
    const lightCartItems = cart.map(i => {
      const itemToSave: any = {
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        selectedSize: i.selectedSize,
        quantity: i.quantity
      };
      if (i.product.originalPrice && i.product.originalPrice > i.product.price) {
        itemToSave.originalPrice = i.product.originalPrice;
      }
      return itemToSave;
    });

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


