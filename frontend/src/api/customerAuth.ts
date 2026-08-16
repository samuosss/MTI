import { customerRequest } from "./customerClient";

export interface CustomerOut {
  id: number;
  email: string;
  full_name: string;
  is_verified: boolean;
}

export function signup(email: string, fullName: string, password: string): Promise<CustomerOut> {
  return customerRequest<CustomerOut>("/customers/auth/signup", "POST", {
    email,
    full_name: fullName,
    password,
  });
}

export function login(email: string, password: string): Promise<CustomerOut> {
  return customerRequest<CustomerOut>("/customers/auth/login", "POST", {
    email,
    password,
  });
}

export function logout(): Promise<void> {
  return customerRequest<void>("/customers/auth/logout", "POST");
}

export function getCurrentCustomer(): Promise<CustomerOut> {
  return customerRequest<CustomerOut>("/customers/auth/me", "GET");
}

export function forgotPassword(email: string): Promise<void> {
  return customerRequest<void>("/customers/auth/forgot-password", "POST", { email });
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return customerRequest<void>("/customers/auth/reset-password", "POST", {
    token,
    new_password: newPassword,
  });
}

export function verifyEmail(token: string): Promise<CustomerOut> {
  return customerRequest<CustomerOut>("/customers/auth/verify-email", "POST", { token });
}

export function resendVerification(): Promise<void> {
  return customerRequest<void>("/customers/auth/resend-verification", "POST");
}