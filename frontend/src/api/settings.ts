import { apiGet, apiJson } from "./client";

export interface CurrencyItem {
  code: string;
  symbol: string;
  enabled: boolean;
  rate: number;
}

export interface LanguageItem {
  code: string;
  label: string;
  enabled: boolean;
}

export interface SiteSettingsOut {
  maintenance_enabled: boolean;
  maintenance_message: string | null;
  currencies: CurrencyItem[];
  default_currency: string;
  languages: LanguageItem[];
  default_language: string;
  maintenance_image_url: string | null;
}

export type SiteSettingsPatch = Partial<SiteSettingsOut>;

/** Public — no token required, safe to call before login/for anonymous visitors. */
export function getPublicSettings(): Promise<SiteSettingsOut> {
  return apiGet<SiteSettingsOut>("/api/settings", { auth: false });
}

export function getAdminSettings(): Promise<SiteSettingsOut> {
  return apiGet<SiteSettingsOut>("/api/settings/admin");
}

export function updateSettings(patch: SiteSettingsPatch): Promise<SiteSettingsOut> {
  return apiJson<SiteSettingsOut>("/api/settings/admin", "PATCH", patch);
}