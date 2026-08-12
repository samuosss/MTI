import { apiClient } from "../apiClient";
import type { ApiOrder, OrderCreateInput, OrderStatusValue } from "../apiTypes";

export async function createOrder(payload: OrderCreateInput): Promise<ApiOrder> {
  const { data } = await apiClient.post<ApiOrder>("/api/orders", payload);
  return data;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listOrders(): Promise<ApiOrder[]> {
  const { data } = await apiClient.get<ApiOrder[]>("/api/orders");
  return data;
}

export async function getOrder(id: number): Promise<ApiOrder> {
  const { data } = await apiClient.get<ApiOrder>(`/api/orders/${id}`);
  return data;
}

export async function updateOrderStatus(id: number, status: OrderStatusValue): Promise<ApiOrder> {
  const { data } = await apiClient.patch<ApiOrder>(`/api/orders/${id}/status`, { status });
  return data;
}
