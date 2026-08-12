import { apiClient, setAdminToken, clearAdminToken } from "../apiClient";

export async function adminLogin(email: string, password: string): Promise<void> {
  // Backend expects OAuth2PasswordRequestForm: form-urlencoded body with a
  // "username" field (holding the admin's email) and a "password" field —
  // not JSON. See backend/app/routers/auth.py.
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  const { data } = await apiClient.post<{ access_token: string; token_type: string }>(
    "/api/auth/login",
    body,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  setAdminToken(data.access_token);
}

export function adminLogout(): void {
  clearAdminToken();
}