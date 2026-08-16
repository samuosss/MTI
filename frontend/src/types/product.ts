// Mirrors app/schemas/product.py on the backend. Keep these in sync if the
// backend shapes change — there is no codegen step, this is hand-maintained.

export type SpecLabel = "RAM" | "Processor" | "Graphics Card" | "Storage" | "Screen";

export const SPEC_LABELS: SpecLabel[] = [
  "RAM",
  "Processor",
  "Graphics Card",
  "Storage",
  "Screen",
];

export interface ProductSpecIn {
  label: SpecLabel;
  value: string;
  notes?: string | null;
}

export interface ProductSpecOut extends ProductSpecIn {
  id: number;
}

export interface ProductImageOut {
  id: number;
  image_url: string;
  is_primary: boolean;
  position: number;
}

export interface ProductVariantOptionIn {
  group_label: string;
  option_label: string;
  image_url?: string | null;
  position?: number;
  is_default?: boolean;
}

export interface ProductVariantOptionOut extends ProductVariantOptionIn {
  id: number;
}

export interface CategoryOut {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: number | null;
}

export interface CategoryTreeOut extends CategoryOut {
  children: CategoryTreeOut[];
}

export interface BrandOut {
  id: number;
  name: string;
}

export interface ProductOut {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  badge: string | null;
  stock: number;
  rating: number;
  category_id: number | null;
  brand_id: number | null;
  category: CategoryOut | null;
  brand: BrandOut | null;
  images: ProductImageOut[];
  specs: ProductSpecOut[];
  variant_options: ProductVariantOptionOut[];
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  total: number;
  page: number;
  page_size: number;
  items: ProductOut[];
}

// ── Form-facing shapes (what the admin form builds before sending) ─────────

export interface ProductFormValues {
  name: string;
  description: string;
  price: string; // kept as string in the form, parsed to number on submit
  original_price: string;
  badge: string;
  stock: string;
  rating: string;
  category_id: number | null;
  slug: string;
  specs: ProductSpecIn[];
}

export interface ProductListFilters {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: number;
  brand_id?: number;
  min_price?: number;
  max_price?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
}