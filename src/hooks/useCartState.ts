import { useState, useEffect, useCallback } from 'react';
import { CartItem, Product, UserProfile } from '../types';
import { userDataService } from '../services/userDataService';

export function useCartState(currentUser: UserProfile | null) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Carregar carrinho do localStorage isolado por UID
  useEffect(() => {
    const userUid = currentUser?.uid || null;
    const loadedCart = userDataService.loadLocalCart(userUid);
    setCart(loadedCart);
  }, [currentUser?.uid]);

  // Salvar carrinho quando for alterado
  const persistCart = useCallback((newCart: CartItem[]) => {
    setCart(newCart);
    const userUid = currentUser?.uid || null;
    userDataService.saveLocalCart(userUid, newCart);
  }, [currentUser?.uid]);

  const addToCart = useCallback((product: Product, size: number | string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && String(item.selectedSize) === String(size)
      );

      let updated: CartItem[];
      if (existingIndex > -1) {
        updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
      } else {
        updated = [...prevCart, { product, selectedSize: size, quantity: 1 }];
      }

      const userUid = currentUser?.uid || null;
      userDataService.saveLocalCart(userUid, updated);
      return updated;
    });
  }, [currentUser?.uid]);

  const removeFromCart = useCallback((productId: string, size: number | string) => {
    setCart((prevCart) => {
      const updated = prevCart.filter(
        (item) => !(item.product.id === productId && String(item.selectedSize) === String(size))
      );
      const userUid = currentUser?.uid || null;
      userDataService.saveLocalCart(userUid, updated);
      return updated;
    });
  }, [currentUser?.uid]);

  const updateCartQuantity = useCallback((productId: string, size: number | string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        const updated = prevCart.filter(
          (item) => !(item.product.id === productId && String(item.selectedSize) === String(size))
        );
        const userUid = currentUser?.uid || null;
        userDataService.saveLocalCart(userUid, updated);
        return updated;
      }

      const updated = prevCart.map((item) => {
        if (item.product.id === productId && String(item.selectedSize) === String(size)) {
          return { ...item, quantity };
        }
        return item;
      });

      const userUid = currentUser?.uid || null;
      userDataService.saveLocalCart(userUid, updated);
      return updated;
    });
  }, [currentUser?.uid]);

  const clearCart = useCallback(() => {
    setCart([]);
    const userUid = currentUser?.uid || null;
    userDataService.saveLocalCart(userUid, []);
  }, [currentUser?.uid]);

  return {
    cart,
    setCart: persistCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
  };
}
