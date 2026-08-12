import { customerRequest } from "./customerClient";
import type { ProductOut } from "../types/product";

export interface SavedProductOut {
  id: number;
  product: ProductOut;
  created_at: string;
}

export function getWishlist(): Promise<SavedProductOut[]> {
  return customerRequest<SavedProductOut[]>("/api/customers/wishlist", "GET");
}

export function addToWishlist(productId: number): Promise<SavedProductOut> {
  return customerRequest<SavedProductOut>("/api/customers/wishlist", "POST", {
    product_id: productId,
  });
}

export function removeFromWishlist(productId: number): Promise<void> {
  return customerRequest<void>(`/api/customers/wishlist/${productId}`, "DELETE");
}