// POST  /api/quotes
// GET   /api/quotes
// GET   /api/quotes/{quote_id}
// PATCH /api/quotes/{quote_id}

import { apiForm, apiGet, apiJson } from "./client";

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

export interface QuoteUpdateInput {
  status?: QuoteStatus;
  estimated_value?: number | null;
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

  return apiForm("/api/quotes", "POST", formData, { auth: false });
}

export function listQuotes(status?: QuoteStatus): Promise<QuoteListResponse> {
  const qs = status ? `?status=${status}` : "";
  return apiGet<QuoteListResponse>(`/api/quotes${qs}`);
}

export function getQuote(id: number): Promise<QuoteRequest> {
  return apiGet<QuoteRequest>(`/api/quotes/${id}`);
}

export function updateQuote(id: number, data: QuoteUpdateInput): Promise<QuoteRequest> {
  return apiJson<QuoteRequest>(`/api/quotes/${id}`, "PATCH", data);
}
