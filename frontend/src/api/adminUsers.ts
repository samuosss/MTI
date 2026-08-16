// GET    /api/admin-users
// POST   /api/admin-users
// PATCH  /api/admin-users/{user_id}
// DELETE /api/admin-users/{user_id}
// POST   /api/auth/change-password

import { apiDelete, apiGet, apiJson } from "./client";

export type AdminRole = "admin" | "moderator";

export interface AdminUserOut {
  id: number;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
}

export interface AdminUserCreateInput {
  email: string;
  full_name: string;
  password: string;
  role: AdminRole;
}

export interface AdminUserUpdateInput {
  email?: string;
  full_name?: string;
  password?: string;
  role?: AdminRole;
  is_active?: boolean;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export function listAdminUsers(): Promise<AdminUserOut[]> {
  return apiGet<AdminUserOut[]>("/admin-users");
}

export function createAdminUser(data: AdminUserCreateInput): Promise<AdminUserOut> {
  return apiJson<AdminUserOut>("/admin-users", "POST", data);
}

export function updateAdminUser(id: number, data: AdminUserUpdateInput): Promise<AdminUserOut> {
  return apiJson<AdminUserOut>(`/admin-users/${id}`, "PATCH", data);
}

export function deleteAdminUser(id: number): Promise<void> {
  return apiDelete(`/admin-users/${id}`);
}

export function changeOwnPassword(data: ChangePasswordInput): Promise<void> {
  return apiJson<void>("/auth/change-password", "POST", data);
}