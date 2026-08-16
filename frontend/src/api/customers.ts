import { apiGet, apiJson } from "./client";

export interface CustomerAdminOut {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  created_at: string;
}

export interface CustomerListResponse {
  total: number;
  page: number;
  page_size: number;
  items: CustomerAdminOut[];
}

export function listCustomers(
  params: { page?: number; page_size?: number; search?: string } = {},
): Promise<CustomerListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return apiGet<CustomerListResponse>(`/customers/admin${qs ? `?${qs}` : ""}`);
}

export function getCustomer(id: number): Promise<CustomerAdminOut> {
  return apiGet<CustomerAdminOut>(`/customers/admin/${id}`);
}

export function setCustomerActive(id: number, isActive: boolean): Promise<CustomerAdminOut> {
  return apiJson<CustomerAdminOut>(`/customers/admin/${id}/status`, "PATCH", {
    is_active: isActive,
  });
}

export function banCustomer(id: number, reason: string | null): Promise<CustomerAdminOut> {
  return apiJson<CustomerAdminOut>(`/customers/admin/${id}/ban`, "POST", { reason });
}

export function unbanCustomer(id: number): Promise<CustomerAdminOut> {
return apiJson<CustomerAdminOut>(`/customers/admin/${id}/unban`, "POST");
}
export function deleteCustomer(id: number): Promise<void> {
  // NOTE: backend returns 204 No Content. If apiJson always calls response.json(),
  // this may throw on the empty body — verify against client.ts and adjust if needed.
  return apiJson<void>(`/customers/admin/${id}`, "DELETE");

}
