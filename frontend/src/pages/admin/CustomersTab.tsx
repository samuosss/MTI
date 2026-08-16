import { useState, useEffect, useCallback } from "react";
import { Search, X, Ban, ShieldCheck, AlertCircle, CheckCircle, UserX, Trash2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import {
  listCustomers,
  banCustomer,
  unbanCustomer,
  setCustomerActive,
  deleteCustomer,
  type CustomerAdminOut,
} from "../../api/customers";

const PAGE_SIZE = 20;

// ── Deterministic avatar gradient (stable per person, not random per render) ─
const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-cyan-400",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-blue-500",
];
function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// One-time keyframes for the row entrance animation.
function RowAnimationStyles() {
  return (
    <style>{`
      @keyframes customerRowIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-[customerRowIn_0.25s_ease-out] ${type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────
function ActiveToggle({
  active, onToggle, disabled,
}: { active: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      disabled={disabled}
      title={active ? "Désactiver le compte" : "Activer le compte"}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: active ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-[customerRowIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Ban size={18} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">Interdire le client</h2>
            <p className="text-xs text-muted-foreground">Cette action est réversible</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point d'interdire <span className="font-semibold text-foreground">{customer.full_name}</span> ({customer.email}).
            Cela met immédiatement fin à toutes leurs sessions actives.
          </p>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Raison (optionnel)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. Demandes de devis frauduleuses répétées"
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/30 rounded-b-2xl">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "Interdiction en cours..." : "Confirmer l'interdiction"}
          </button>
          <button onClick={onClose} className="px-5 border border-border text-muted-foreground rounded-lg hover:border-primary hover:text-foreground transition-colors text-sm">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────────────────
function DeleteModal({
  customer, onClose, onConfirm,
}: {
  customer: CustomerAdminOut;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression échouée. Veuillez réessayer.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-[customerRowIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">Supprimer le client</h2>
            <p className="text-xs text-red-500 font-medium">Action définitive</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette action supprime définitivement <span className="font-semibold text-foreground">{customer.full_name}</span> ({customer.email})
            et toutes ses données associées (sessions, tokens). <span className="font-semibold text-red-600">Cette action est irréversible.</span>
          </p>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/30 rounded-b-2xl">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "Suppression en cours..." : "Confirmer la suppression"}
          </button>
          <button onClick={onClose} className="px-5 border border-border text-muted-foreground rounded-lg hover:border-primary hover:text-foreground transition-colors text-sm">
            Annuler
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
  const [deleteTarget, setDeleteTarget] = useState<CustomerAdminOut | null>(null);
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
      setToast({ message: `${c.full_name} levé de l'interdiction.`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Échec de la levée de l'interdiction.", type: "error" });
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
    setToast({ message: `${target.full_name} interdit.`, type: "success" });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setActingId(target.id);
    await deleteCustomer(target.id);
    setCustomers((prev) => prev.filter((c) => c.id !== target.id));
    setTotal((prev) => prev - 1);
    setActingId(null);
    setDeleteTarget(null);
    setToast({ message: `${target.full_name} supprimé.`, type: "success" });
  }

  async function handleToggleActive(c: CustomerAdminOut) {
    setActingId(c.id);
    try {
      const updated = await setCustomerActive(c.id, !c.is_active);
      patchCustomer(updated);
      setToast({ message: `${c.full_name} ${updated.is_active ? "activé" : "désactivé"}.`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Échec de la mise à jour.", type: "error" });
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <RowAnimationStyles />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users size={15} className="text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement..." : (
              <>
                <span className="font-bold text-foreground text-base">{total}</span> client{total !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email ou nom..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 backdrop-blur-sm border-b border-border sticky top-0 z-10">
            <tr>
              <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-4 py-3">Client</th>
              <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-4 py-3 hidden md:table-cell">Adhésion</th>
              <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-4 py-3">Statut</th>
              <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-4 py-3 hidden lg:table-cell">Raison de l'interdiction</th>
              <th className="text-right text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary animate-pulse flex-shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 rounded bg-secondary animate-pulse" />
                        <div className="h-2.5 w-36 rounded bg-secondary animate-pulse" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 w-16 rounded bg-secondary animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-20 rounded-full bg-secondary animate-pulse" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-8 rounded bg-secondary animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-7 w-32 rounded-full bg-secondary animate-pulse ml-auto" /></td>
                </tr>
              ))
            )}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Users size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">Aucun client trouvé.</p>
                  <p className="text-xs text-muted-foreground">Essayez d'ajuster votre recherche.</p>
                </td>
              </tr>
            )}
            {customers.map((c, i) => (
              <tr
                key={c.id}
                className="group hover:bg-secondary/40 transition-colors border-l-2 border-transparent hover:border-l-primary"
                style={{ animation: "customerRowIn 0.3s ease-out both", animationDelay: `${Math.min(i, 12) * 30}ms` }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(c.email)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ring-2 ring-white`}
                    >
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
                  <div className="flex items-center gap-3">
                    {c.is_banned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-600">
                        <Ban size={10} /> INTERDIT
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          active={c.is_active}
                          onToggle={() => handleToggleActive(c)}
                          disabled={actingId === c.id}
                        />
                        <span className={`text-xs font-medium ${c.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {c.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground max-w-[220px]">
                  {c.ban_reason ? <span className="line-clamp-2">{c.ban_reason}</span> : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    {c.is_banned ? (
                      <button
                        onClick={() => handleUnban(c)}
                        disabled={actingId === c.id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 hover:shadow-sm hover:-translate-y-px transition-all disabled:opacity-40"
                      >
                        <ShieldCheck size={13} /> Lever
                      </button>
                    ) : (
                      <button
                        onClick={() => setBanTarget(c)}
                        disabled={actingId === c.id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 hover:shadow-sm hover:-translate-y-px transition-all disabled:opacity-40"
                      >
                        <UserX size={13} /> Interdire
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(c)}
                      disabled={actingId === c.id}
                      title="Supprimer définitivement"
                      className="flex items-center justify-center w-8 h-8 text-red-600 border border-red-200 bg-red-50 rounded-full hover:bg-red-500 hover:text-white hover:shadow-sm hover:-translate-y-px transition-all disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
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
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-primary hover:shadow-sm transition-all disabled:opacity-40"
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
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  page === n ? "bg-primary text-white shadow-sm" : "border border-border hover:border-primary text-foreground"
                }`}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-primary hover:shadow-sm transition-all disabled:opacity-40"
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
      {deleteTarget && (
        <DeleteModal
          customer={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}