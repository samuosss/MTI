import { useState } from "react";
import { useNavigate } from "react-router";
import { addToCart } from "../api/cart";
import { ApiError } from "../api/client";

interface UseAddToCartResult {
  addItem: (productId: number, quantity?: number) => Promise<void>;
  isAdding: boolean;
  error: string | null;
  needsVerification: boolean;
  dismissVerificationNotice: () => void;
}

/**
 * Wraps addToCart() with the two "blocked" cases handled the simple way:
 * - Not logged in at all      → redirect straight to /login (which should offer
 *                                 "s'inscrire" too), instead of showing an error
 *                                 the visitor can't act on from here.
 * - Logged in, not verified   → don't redirect (they already have an account),
 *                                 just flag `needsVerification` so the caller can
 *                                 show <EmailVerificationBanner /> or a toast.
 *
 * @param isAuthenticated pass your existing auth-state check (session/customer != null)
 */
export function useAddToCart(isAuthenticated: boolean): UseAddToCartResult {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function addItem(productId: number, quantity: number = 1) {
    setError(null);
    setNeedsVerification(false);

    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(productId, quantity);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setNeedsVerification(true);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setIsAdding(false);
    }
  }

  return {
    addItem,
    isAdding,
    error,
    needsVerification,
    dismissVerificationNotice: () => setNeedsVerification(false),
  };
}