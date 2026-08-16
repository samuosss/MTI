// POST /api/auth/login
// GET  /api/auth/me

import { apiGet, apiLoginForm, clearToken, setToken } from "./client";
import type { LoginResponse, AdminUser } from "../types/auth";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await apiLoginForm<LoginResponse>("/auth/login", {
    username: email, // FastAPI OAuth2 uses "username" field even for email
    password,
  });
  setToken(result.access_token);
  return result;
}

export function logout(): void {
  clearToken();
}

export function getMe(): Promise<AdminUser> {
  return apiGet<AdminUser>("/auth/me");
}