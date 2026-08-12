import { useState, useEffect, useCallback } from "react";
import { Search, X, ChevronLeft, ChevronRight, Ban, ShieldCheck, AlertCircle, CheckCircle, UserX } from "lucide-react";
import {
  listCustomers,
  banCustomer,
  unbanCustomer,
  setCustomerActive,
  type CustomerAdminOut,
} from "../../api/customers";

const PAGE_SIZE = 20;

// ── Toast (same shell as ProductsTab) ──────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Ban reason modal ─────────────────────────────────────────────────────
function BanModal({
  customer, onClose, onConfirm,
}: {
  customer: CustomerAdminOut;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(reason.trim() || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ban failed. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Ban size={18} className="text-red-500" /> Ban Customer
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            You're about to ban <span className="font-semibold text-foreground">{customer.full_name}</span> ({customer.email}).
            This immediately ends all their active sessions.
          </p>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated fraudulent quote requests"
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "Banning…" : "Confirm Ban"}
          </button>
          <button onClick={onClose} className="px-5 border border-border text-muted-foreground rounded-lg hover:border-primary transition-colors text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersTab() {
  const [customers, setCustomers] = useState<CustomerAdminOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [banTarget, setBanTarget] = useState<CustomerAdminOut | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const load = useCallback(() => {
    setLoading(true);
    listCustomers({ page, page_size: PAGE_SIZE, search: debouncedSearch || undefined })
      .then((res) => {
        setCustomers(res.items);
        setTotal(res.total);
      })
      .catch(() => setToast({ message: "Failed to load customers.", type: "error" }))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function patchCustomer(updated: CustomerAdminOut) {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleUnban(c: CustomerAdminOut) {
    setActingId(c.id);
    try {
      const updated = await unbanCustomer(c.id);
      patchCustomer(updated);
      setToast({ message: `${c.full_name} unbanned.`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Unban failed.", type: "error" });
    } finally {
      setActingId(null);
    }
  }

  async function handleBanConfirm(reason: string) {
    if (!banTarget) return;
    const target = banTarget;
    setActingId(target.id);
    const updated = await banCustomer(target.id, reason || null);
    patchCustomer(updated);
    setActingId(null);
    setBanTarget(null);
    setToast({ message: `${target.full_name} banned.`, type: "success" });
  }

  async function handleToggleActive(c: CustomerAdminOut) {
    setActingId(c.id);
    try {
      const updated = await setCustomerActive(c.id, !c.is_active);
      patchCustomer(updated);
      setToast({ message: `${c.full_name} ${updated.is_active ? "activated" : "deactivated"}.`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Update failed.", type: "error" });
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : (
            <>
              <span className="font-semibold text-foreground">{total}</span> customer{total !== 1 ? "s" : ""}
            </>
          )}
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Customer</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3 hidden md:table-cell">Joined</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Status</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3 hidden lg:table-cell">Ban Reason</th>
              <th className="text-right text-xs text-muted-foreground font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading customers…</td></tr>
            )}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-foreground mb-1">No customers found.</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your search.</p>
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {c.full_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground line-clamp-1 max-w-[200px]">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.is_banned ? "bg-red-100 text-red-600" : "bg-secondary text-muted-foreground"
                    }`}>
                      {c.is_banned ? "BANNED" : "NOT BANNED"}
                    </span>
                    <button
                      onClick={() => handleToggleActive(c)}
                      disabled={actingId === c.id}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors disabled:opacity-40 ${
                        c.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                      }`}
                    >
                      {c.is_active ? "ACTIVE" : "INACTIVE"}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground max-w-[220px]">
                  {c.ban_reason ? <span className="line-clamp-2">{c.ban_reason}</span> : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {c.is_banned ? (
                      <button
                        onClick={() => handleUnban(c)}
                        disabled={actingId === c.id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40"
                      >
                        <ShieldCheck size={13} /> Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => setBanTarget(c)}
                        disabled={actingId === c.id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        <UserX size={13} /> Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:border-primary transition-colors disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const n =
              totalPages <= 5 ? i + 1
              : page <= 3 ? i + 1
              : page >= totalPages - 2 ? totalPages - 4 + i
              : page - 2 + i;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  page === n ? "bg-primary text-white" : "border border-border hover:border-primary text-foreground"
                }`}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:border-primary transition-colors disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {banTarget && (
        <BanModal
          customer={banTarget}
          onClose={() => setBanTarget(null)}
          onConfirm={handleBanConfirm}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}