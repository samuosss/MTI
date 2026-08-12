import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { useCustomerAuth } from "./CustomerAuthContext";
import { useAuthModal } from "./AuthModalContext";
import * as wishlistApi from "../api/wishlist";
import type { ProductOut } from "../types/product";

interface WishlistContextValue {
  wishlist: ProductOut[];
  loading: boolean;
  isSaved: (productId: number) => boolean;
  toggleWishlist: (product: ProductOut) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useCustomerAuth();
  const { openAuthModal } = useAuthModal();
  const [wishlist, setWishlist] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      const items = await wishlistApi.getWishlist();
      setWishlist(items.map((i) => i.product));
    } catch {
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback(
    (productId: number) => wishlist.some((p) => p.id === productId),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    async (product: ProductOut) => {
      if (!isAuthenticated) {
        openAuthModal("login");
        return;
      }
      if (isSaved(product.id)) {
        await wishlistApi.removeFromWishlist(product.id);
        setWishlist((prev) => prev.filter((p) => p.id !== product.id));
      } else {
        await wishlistApi.addToWishlist(product.id);
        setWishlist((prev) => [product, ...prev]);
      }
    },
    [isAuthenticated, isSaved, openAuthModal],
  );

  return (
    <WishlistContext.Provider value={{ wishlist, loading, isSaved, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}