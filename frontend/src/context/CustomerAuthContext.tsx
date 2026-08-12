import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import * as customerAuthApi from "../api/customerAuth";
import type { CustomerOut } from "../api/customerAuth";

interface CustomerAuthContextValue {
  customer: CustomerOut | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signup: (email: string, fullName: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await customerAuthApi.getCurrentCustomer();
      setCustomer(result);
    } catch {
      setCustomer(null);
    }
  }, []);

  // On mount, check if a valid session cookie already exists (e.g. page refresh).
  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const signup = useCallback(async (email: string, fullName: string, password: string) => {
    const result = await customerAuthApi.signup(email, fullName, password);
    setCustomer(result);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await customerAuthApi.login(email, password);
    setCustomer(result);
  }, []);

  const logout = useCallback(async () => {
    try {
      await customerAuthApi.logout();
    } catch {
      // even if the request fails, clear local state so the UI reflects logged-out
    }
    setCustomer(null);
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{ customer, isAuthenticated: !!customer, isLoading, signup, login, logout, refresh }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  return ctx;
}