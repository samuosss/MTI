import axios from "axios";

// Cast import.meta to any to access Vite env without a global type declaration here
export const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const TOKEN_KEY = "mti_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminToken();
    }
    return Promise.reject(error);
  }
);
