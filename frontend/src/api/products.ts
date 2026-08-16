// GET    /api/products
// GET    /api/products/{slug}
// POST   /api/products
// PATCH  /api/products/{product_id}
// DELETE /api/products/{product_id}
// GET    /api/products/categories
// GET    /api/products/categories/tree
// POST   /api/products/categories
// PATCH  /api/products/categories/{category_id}
// DELETE /api/products/categories/{category_id}
// GET    /api/products/brands
// PATCH  /api/products/{product_id}/images/{image_id}/primary
// DELETE /api/products/{product_id}/images/{image_id}

import { apiGet, apiForm, apiJson, apiDelete } from "./client";
import type {
  ProductOut,
  ProductListResponse,
  ProductListFilters,
  ProductSpecIn,
  CategoryOut,
  CategoryTreeOut,
  BrandOut,
} from "../types/product";

// ─── Products ────────────────────────────────────────────────────────────────

export function listProducts(filters: ProductListFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (filters.page)                         params.set("page",        String(filters.page));
  if (filters.page_size)                    params.set("page_size",   String(filters.page_size));
  if (filters.search)                       params.set("search",      filters.search);
  if (filters.category_id)                  params.set("category_id", String(filters.category_id));
  if (filters.brand_id)                     params.set("brand_id",    String(filters.brand_id));
  if (filters.min_price !== undefined)      params.set("min_price",   String(filters.min_price));
  if (filters.max_price !== undefined)      params.set("max_price",   String(filters.max_price));
  if (filters.sort)                         params.set("sort",        filters.sort);
  const qs = params.toString();
  return apiGet<ProductListResponse>(`/products${qs ? `?${qs}` : ""}`, { auth: false });
}

export function getProductBySlug(slug: string): Promise<ProductOut> {
  return apiGet<ProductOut>(`/products/${slug}`, { auth: false });
}

export interface ProductWriteInput {
  name?:           string;
  description?:    string | null;
  price?:          number;
  original_price?: number | null;
  badge?:          string | null;
  stock?:          number;
  rating?:         number;
  category_id?:    number | null;
  brand_id?:       number | null;
  slug?:           string | null;
  specs?:          ProductSpecIn[];
  images?:         File[];
  primary_index?:  number | null;
}

function buildProductFormData(data: ProductWriteInput): FormData {
  const fd = new FormData();
  if (data.name !== undefined)                               fd.append("name",           data.name);
  if (data.description != null)                              fd.append("description",    data.description);
  if (data.price !== undefined)                              fd.append("price",          String(data.price));
  if (data.original_price != null)                           fd.append("original_price", String(data.original_price));
  if (data.badge != null)                                    fd.append("badge",          data.badge);
  if (data.stock !== undefined)                              fd.append("stock",          String(data.stock));
  if (data.rating !== undefined)                             fd.append("rating",         String(data.rating));
  if (data.category_id != null)                              fd.append("category_id",    String(data.category_id));
  if (data.brand_id != null)                                 fd.append("brand_id",       String(data.brand_id));
  if (data.slug != null)                                     fd.append("slug",           data.slug);
  if (data.specs !== undefined)                              fd.append("specs",          JSON.stringify(data.specs));
  if (data.primary_index != null)                            fd.append("primary_index",  String(data.primary_index));
  if (data.images) data.images.forEach(f => fd.append("images", f));
  return fd;
}

export function createProduct(data: ProductWriteInput): Promise<ProductOut> {
  return apiForm<ProductOut>("/products", "POST", buildProductFormData(data));
}

export function updateProduct(id: number, data: ProductWriteInput): Promise<ProductOut> {
  return apiForm<ProductOut>(`/products/${id}`, "PATCH", buildProductFormData(data));
}

export function deleteProduct(id: number): Promise<void> {
  return apiDelete(`/products/${id}`);
}

export function setPrimaryImage(productId: number, imageId: number): Promise<ProductOut> {
  return apiJson<ProductOut>(`/products/${productId}/images/${imageId}/primary`, "PATCH");
}

export function deleteProductImage(productId: number, imageId: number): Promise<void> {
  return apiDelete(`/products/${productId}/images/${imageId}`);
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface CategoryWriteInput {
  name:       string;
  slug?:      string | null;
  icon?:      string | null;
  parent_id?: number | null;
}

export interface CategoryUpdateInput {
  name?:      string;
  icon?:      string | null;
  parent_id?: number | null;
}

export function listCategories(): Promise<CategoryOut[]> {
  return apiGet<CategoryOut[]>("/products/categories", { auth: false });
}

export function listCategoriesTree(): Promise<CategoryTreeOut[]> {
  return apiGet<CategoryTreeOut[]>("/products/categories/tree", { auth: false });
}

export function createCategory(data: CategoryWriteInput): Promise<CategoryOut> {
  return apiJson<CategoryOut>("/products/categories", "POST", data);
}

export function updateCategory(id: number, data: CategoryUpdateInput): Promise<CategoryOut> {
  return apiJson<CategoryOut>(`/products/categories/${id}`, "PATCH", data);
}

export function deleteCategory(id: number): Promise<void> {
  return apiDelete(`/products/categories/${id}`);
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export function listBrands(): Promise<BrandOut[]> {
  return apiGet<BrandOut[]>("/products/brands", { auth: false });
}