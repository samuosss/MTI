import { customerRequest } from "./customerClient";
import type { ProductOut } from "../types/product";

export interface CartItemOut {
  id: number;
  product: ProductOut;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export function getCart(): Promise<CartItemOut[]> {
  return customerRequest<CartItemOut[]>("/api/customers/cart", "GET");
}

export function addToCart(productId: number, quantity: number = 1): Promise<CartItemOut> {
  return customerRequest<CartItemOut>("/api/customers/cart", "POST", {
    product_id: productId,
    quantity,
  });
}

export function updateCartItemQuantity(
  productId: number,
  quantity: number,
): Promise<CartItemOut | null> {
  return customerRequest<CartItemOut | null>(`/api/customers/cart/${productId}`, "PATCH", {
    quantity,
  });
}

export function removeCartItem(productId: number): Promise<void> {
  return customerRequest<void>(`/api/customers/cart/${productId}`, "DELETE");
}

export function clearCart(): Promise<void> {
  return customerRequest<void>("/api/customers/cart", "DELETE");
}