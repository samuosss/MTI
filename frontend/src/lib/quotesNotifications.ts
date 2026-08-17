const STORAGE_KEY = "admin_quotes_last_seen_at";

/**
 * ISO timestamp of the last time the admin opened / acknowledged the
 * "Demandes de devis" tab. Defaults to the epoch so that, on a brand
 * new browser with nothing in localStorage, every existing quote is
 * treated as "new" until the admin visits the tab once.
 */
export function getLastSeenQuotesAt(): string {
  return localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString();
}

/** Call this whenever the admin has just viewed the quotes list. */
export function markQuotesSeen(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}