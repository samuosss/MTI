// Shared helper for all customer-session (cookie-based) endpoints —
// used by customerAuth.ts, cart.ts, and wishlist.ts.

import { API_BASE_URL, parseResponse } from "./client";

export async function customerRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include", // sends/receives the session_token cookie
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}