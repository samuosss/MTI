import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { useCustomerAuth } from "./CustomerAuthContext";
import { useAuthModal } from "./AuthModalContext";
import * as cartApi from "../api/cart";
import { ApiError } from "../api/client";
import type { ProductOut } from "../types/product";

export interface CartLine {
  product: ProductOut;
  qty: number;
}

interface CartContextValue {
  cart: CartLine[];
  cartCount: number;
  loading: boolean;
  addToCart: (product: ProductOut, qty?: number) => Promise<void>;
  updateQty: (productId: number, qty: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  // true quand un ajout au panier a été bloqué par le backend car l'email
  // du customer n'est pas encore vérifié (403). L'UI (ex: bannière, toast)
  // peut réagir à ce flag et le customer peut le fermer avec dismiss.
  verificationRequired: boolean;
  dismissVerificationRequired: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function toCartLine(item: cartApi.CartItemOut): CartLine {
  return { product: item.product, qty: item.quantity };
}

function isEmailNotVerifiedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useCustomerAuth();
  const { openAuthModal } = useAuthModal();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart([]);
      return;
    }
    setLoading(true);
    try {
      const items = await cartApi.getCart();
      setCart(items.map(toCartLine));
    } catch {
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Re-sync whenever auth state flips (login populates the cart, logout clears it)
  useEffect(() => {
    refresh();
  }, [refresh]);

  const dismissVerificationRequired = useCallback(() => setVerificationRequired(false), []);

  const addToCart = useCallback(
    async (product: ProductOut, qty: number = 1) => {
      if (!isAuthenticated) {
        openAuthModal("login");
        return;
      }
      try {
        const updated = await cartApi.addToCart(product.id, qty);
        setCart((prev) => {
          const exists = prev.find((i) => i.product.id === updated.product.id);
          return exists
            ? prev.map((i) => (i.product.id === updated.product.id ? toCartLine(updated) : i))
            : [...prev, toCartLine(updated)];
        });
      } catch (err) {
        if (isEmailNotVerifiedError(err)) {
          // Ne pas silently fail : signale à l'UI qu'il faut pousser le customer
          // vers la vérification email plutôt que de laisser l'ajout disparaître sans explication.
          setVerificationRequired(true);
          return;
        }
        throw err;
      }
    },
    [isAuthenticated, openAuthModal],
  );

  const updateQty = useCallback(
    async (productId: number, qty: number) => {
      if (!isAuthenticated) return;
      if (qty <= 0) {
        await cartApi.removeCartItem(productId);
        setCart((prev) => prev.filter((i) => i.product.id !== productId));
        return;
      }
      const updated = await cartApi.updateCartItemQuantity(productId, qty);
      if (updated) {
        setCart((prev) => prev.map((i) => (i.product.id === productId ? toCartLine(updated) : i)));
      }
    },
    [isAuthenticated],
  );

  const removeFromCart = useCallback(
    async (productId: number) => {
      if (!isAuthenticated) return;
      await cartApi.removeCartItem(productId);
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    },
    [isAuthenticated],
  );

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart([]);
      return;
    }
    await cartApi.clearCart();
    setCart([]);
  }, [isAuthenticated]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        verificationRequired,
        dismissVerificationRequired,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}