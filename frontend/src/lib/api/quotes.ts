import { apiClient } from "../apiClient";
import type { ApiQuoteRequest, QuoteStatusValue } from "../apiTypes";

export interface QuoteRequestFormInput {
  company: string;
  contact: string;
  email: string;
  phone?: string;
  description?: string;
  file?: File | null;
}

export async function submitQuoteRequest(payload: QuoteRequestFormInput): Promise<ApiQuoteRequest> {
  const formData = new FormData();
  formData.append("company", payload.company);
  formData.append("contact", payload.contact);
  formData.append("email", payload.email);
  if (payload.phone) formData.append("phone", payload.phone);
  if (payload.description) formData.append("description", payload.description);
  if (payload.file) formData.append("file", payload.file);

  const { data } = await apiClient.post<ApiQuoteRequest>("/quotes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listQuoteRequests(): Promise<ApiQuoteRequest[]> {
  const { data } = await apiClient.get<ApiQuoteRequest[]>("/quotes");
  return data;
}

export async function updateQuoteStatus(id: number, status: QuoteStatusValue): Promise<ApiQuoteRequest> {
  const { data } = await apiClient.patch<ApiQuoteRequest>(`/quotes/${id}/status`, { status });
  return data;
}
