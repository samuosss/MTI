// POST  /api/service-inquiries
// GET   /api/service-inquiries
// PATCH /api/service-inquiries/{inquiry_id}/resolve

import { apiGet, apiJson } from "./client";

export interface ServiceInquiryCreateInput {
  customer_name:   string;
  customer_email:  string;
  customer_phone?: string | null;
  service_type:    string;
  message:         string;
}

export function submitServiceInquiry(data: ServiceInquiryCreateInput): Promise<unknown> {
  return apiJson("/api/service-inquiries", "POST", data, { auth: false });
}

export function listServiceInquiries(): Promise<unknown[]> {
  return apiGet("/api/service-inquiries");
}

export function resolveServiceInquiry(id: number): Promise<unknown> {
  return apiJson(`/api/service-inquiries/${id}/resolve`, "PATCH");
}