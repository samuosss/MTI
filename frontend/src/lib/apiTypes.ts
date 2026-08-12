// Mirrors backend/app/schemas/*.py — keep in sync with the FastAPI models.

export interface ApiProduct {
  id: number;
  brand: string;
  name: string;
  specs: string[];
  price_num: number;
  original_price_num: number | null;
  badge: string | null;
  image_url: string | null;
  category: string;
  description: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProductCreateInput {
  brand: string;
  name: string;
  specs: string[];
  price_num: number;
  original_price_num?: number | null;
  badge?: string | null;
  image_url?: string | null;
  category: string;
  description: string;
  stock: number;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

export interface OrderItemInput {
  product_id: number;
  qty: number;
}

export interface OrderCreateInput {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_address?: string | null;
  items: OrderItemInput[];
}

export type OrderStatusValue = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface ApiOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  qty: number;
}

export interface ApiOrder {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  status: OrderStatusValue;
  total_amount: number;
  created_at: string;
  items: ApiOrderItem[];
}

export type QuoteStatusValue = "new" | "reviewed" | "quoted" | "closed";

export interface ApiQuoteRequest {
  id: number;
  company: string;
  contact: string;
  email: string;
  phone: string | null;
  description: string | null;
  attachment_url: string | null;
  status: QuoteStatusValue;
  created_at: string;
}

export type ServiceRequestStatusValue = "new" | "in_progress" | "completed";

export interface ApiServiceRequest {
  id: number;
  name: string;
  email: string;
  service: string;
  scope: string | null;
  details: string | null;
  status: ServiceRequestStatusValue;
  created_at: string;
}

export interface DashboardKPIs {
  total_inventory_value: number;
  active_quotes: number;
  pending_orders: number;
  monthly_revenue: number;
}

export interface RevenueByCategoryItem {
  category: string;
  revenue: number;
}

export interface DashboardAnalytics {
  kpis: DashboardKPIs;
  revenue_by_category: RevenueByCategoryItem[];
}
