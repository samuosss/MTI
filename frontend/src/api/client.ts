// Central HTTP client for the MTI FastAPI backend.
// Handles: JWT injection, multipart uploads, image URL resolution.

export const API_BASE_URL: string = (import.meta as any).env.VITE_API_URL || "/api";
const TOKEN_STORAGE_KEY = "mti_admin_token";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "detail" in (detail as object)
          ? String((detail as Record<string, unknown>).detail)
          : `Request failed with status ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Resolves a backend-relative path into a full URL for use in <img src>. */
export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
/** Formats a price with 3 decimal places and a dot separator, e.g. 1999 -> "1 999.000" */
export function formatPrice(price: number): string {
  const [intPart, decPart] = price.toFixed(3).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withThousands}.${decPart}`;
}

export async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

interface RequestOptions {
  auth?: boolean;
}

function authHeaders(auth: boolean): HeadersInit {
  if (!auth) return {};
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { ...authHeaders(options.auth ?? true) },
  });
  return parseResponse<T>(res);
}

export async function apiJson<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(options.auth ?? true),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function apiForm<T>(
  path: string,
  method: "POST" | "PATCH",
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...authHeaders(options.auth ?? true) },
    body: formData,
  });
  return parseResponse<T>(res);
}

export async function apiDelete(path: string, options: RequestOptions = {}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders(options.auth ?? true) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
}

/** OAuth2PasswordRequestForm — must be x-www-form-urlencoded, not JSON. */
export async function apiLoginForm<T>(path: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseResponse<T>(res);
}