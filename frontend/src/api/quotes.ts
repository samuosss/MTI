// POST   /api/quotes
// GET    /api/quotes
// GET    /api/quotes/{quote_id}
// PATCH  /api/quotes/{quote_id}
// DELETE /api/quotes/{quote_id}
// GET    /api/quotes/{quote_id}/pdf

import { apiDelete, apiForm, apiGet, apiJson, API_BASE_URL, getToken } from "./client";

export interface QuoteItem {
  product_id: number;
  quantity:   number;
}

export type QuoteStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "COMPLETED";

export interface QuoteRequestItem {
  id: number;
  product_id: number | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
}

export interface QuoteRequest {
  id: number;
  reference: string;
  order_number: number | null;
  company: string;
  contact_person: string;
  email: string;
  phone: string | null;
  description: string | null;
  category: string | null;
  attachment_path: string | null;
  estimated_value: number | null;
  status: QuoteStatus;
  items: QuoteRequestItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteListResponse {
  total: number;
  page: number;
  page_size: number;
  items: QuoteRequest[];
}

export interface QuoteCreateInput {
  company: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  description?: string | null;
  category?: string | null;
  items?: QuoteItem[];
  attachment?: File | null;
}

// Used by the admin dashboard to edit an existing line item's price/quantity.
// `id` refers to the QuoteRequestItem.id (the line item), not the product id.
export interface QuoteItemUpdate {
  id: number;
  unit_price_snapshot: number;
  quantity: number;
}

export interface QuoteUpdateInput {
  status?: QuoteStatus;
  estimated_value?: number | null;
  company?: string;
  contact_person?: string;
  email?: string;
  phone?: string | null;
  description?: string | null;
  category?: string | null;
  items?: QuoteItemUpdate[];
}

export function submitQuote(data: QuoteCreateInput): Promise<unknown> {
  const formData = new FormData();

  formData.append("company", data.company);
  formData.append("contact_person", data.contact_person);
  formData.append("email", data.email);
  if (data.phone) formData.append("phone", data.phone);
  if (data.description) formData.append("description", data.description);
  if (data.category) formData.append("category", data.category);
  if (data.items?.length) formData.append("items", JSON.stringify(data.items));
  if (data.attachment) formData.append("attachment", data.attachment);

  return apiForm("/quotes", "POST", formData, { auth: false });
}

export function listQuotes(status?: QuoteStatus): Promise<QuoteListResponse> {
  const qs = status ? `?status=${status}` : "";
  return apiGet<QuoteListResponse>(`/quotes${qs}`);
}

export function getQuote(id: number): Promise<QuoteRequest> {
  return apiGet<QuoteRequest>(`/quotes/${id}`);
}

export function updateQuote(id: number, data: QuoteUpdateInput): Promise<QuoteRequest> {
  return apiJson<QuoteRequest>(`/quotes/${id}`, "PATCH", data);
}

export function deleteQuote(id: number): Promise<void> {
  return apiDelete(`/quotes/${id}`);
}

// Admin-only: streams the PDF from the backend and triggers a browser download.
// Uses the same token storage (getToken) and base URL as the rest of the admin API client.
export async function downloadQuotePdf(
  id: number,
  orderNumber: number | null,
  reference: string
): Promise<void> {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/quotes/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Échec du téléchargement du PDF.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `devis_${orderNumber ?? reference}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
