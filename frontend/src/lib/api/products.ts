import { apiClient } from "../apiClient";
import type {
  ApiProduct,
  ProductListResponse,
  ProductCreateInput,
  ProductUpdateInput,
} from "../apiTypes";

export interface ListProductsParams {
  category?: string;
  brand?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  page_size?: number;
}

export async function listProducts(params: ListProductsParams = {}): Promise<ProductListResponse> {
  const { data } = await apiClient.get<ProductListResponse>("/products", { params });
  return data;
}

export async function getProduct(id: number): Promise<ApiProduct> {
  const { data } = await apiClient.get<ApiProduct>(`/products/${id}`);
  return data;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function createProduct(payload: ProductCreateInput): Promise<ApiProduct> {
  const { data } = await apiClient.post<ApiProduct>("/products", payload);
  return data;
}

export async function updateProduct(id: number, payload: ProductUpdateInput): Promise<ApiProduct> {
  const { data } = await apiClient.patch<ApiProduct>(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function uploadProductImage(id: number, file: File): Promise<ApiProduct> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ApiProduct>(`/products/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
