// GET /api/dashboard/overview
// GET /api/dashboard/recent-quotes

import { apiGet } from "./client";

export interface DashboardOverview {
  total_inventory_value: number;
  active_quotes: number;
  pending_quotes: number;
  monthly_revenue_estimate: number;
  category_breakdown: {
    name: string;
    value: number;
  }[];
}

export interface QuoteRequestItem {
  id: number;
  product_id: number | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
}

export interface RecentQuote {
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
  status: "PENDING" | "ACTIVE" | "CANCELLED" | "COMPLETED";
  items: QuoteRequestItem[];
  created_at: string;
  updated_at: string;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>("/api/dashboard/overview");
}

export function getRecentQuotes(limit = 5): Promise<RecentQuote[]> {
  return apiGet<RecentQuote[]>(`/api/dashboard/recent-quotes?limit=${limit}`);
}
