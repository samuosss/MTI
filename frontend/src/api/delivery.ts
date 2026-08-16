// api/delivery.ts
import { apiGet, apiJson, apiDelete } from "./client";

export interface DeliveryAgencyOut {
  id: number;
  name: string;
  fee: number; // TND
  eta: string | null;
  active: boolean;
  sort_order: number;
}

export interface DeliveryAgencyInput {
  name: string;
  fee: number;
  eta?: string | null;
  active?: boolean;
  sort_order?: number;
}

/** Public — active agencies only. Used by CartPage at checkout. No auth needed. */
export function listActiveDeliveryAgencies() {
  return apiGet<DeliveryAgencyOut[]>("/delivery-agencies", { auth: false });
}

/** Admin — all agencies, including inactive ones. Requires admin/moderator token. */
export function listAllDeliveryAgencies() {
  return apiGet<DeliveryAgencyOut[]>("/admin/delivery-agencies");
}

export function createDeliveryAgency(data: DeliveryAgencyInput) {
  return apiJson<DeliveryAgencyOut>("/admin/delivery-agencies", "POST", data);
}

export function updateDeliveryAgency(id: number, data: Partial<DeliveryAgencyInput>) {
  return apiJson<DeliveryAgencyOut>(`/admin/delivery-agencies/${id}`, "PATCH", data);
}

export function deleteDeliveryAgency(id: number) {
  return apiDelete(`/admin/delivery-agencies/${id}`);
}