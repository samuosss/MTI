import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Eye, Loader2, Trash2, X } from "lucide-react";
import {
  listQuotes,
  updateQuote,
  deleteQuote,
  downloadQuotePdf,
  type QuoteRequest,
  type QuoteRequestItem,
  type QuoteStatus,
} from "../../api/quotes";
import { formatPrice } from "../../api/client";
import { getLastSeenQuotesAt, markQuotesSeen } from "../../lib/quotesNotifications";

const filters: ("All" | QuoteStatus)[] = [
  "All",
  "ACTIVE",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];

const statusOptions: QuoteStatus[] = [
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

// Display-only French labels — the underlying API values stay in English
// so nothing on the backend (enum, DB, filters) needs to change.
const STATUS_LABELS_FR: Record<"All" | QuoteStatus, string> = {
  All: "Tous",
  PENDING: "En attente",
  ACTIVE: "Active",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

function statusClass(status: QuoteStatus) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "PENDING") return "bg-orange-100 text-orange-600";
  if (status === "COMPLETED") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-600";
}

function formatMoney(value: number | null | undefined) {
  return `${formatPrice(value ?? 0)} TND`;
}

interface EditForm {
  company: string;
  contact_person: string;
  email: string;
  phone: string;
  category: string;
}

// Editable copy of a line item. Kept separate from QuoteRequestItem so the
// admin can type freely (e.g. clear a field) without the underlying data
// getting mangled — it's converted back to numbers only on save.
interface EditItem {
  id: number;
  product_name_snapshot: string;
  unit_price_snapshot: string;
  quantity: string;
}

function toEditForm(q: QuoteRequest): EditForm {
  return {
    company: q.company ?? "",
    contact_person: q.contact_person ?? "",
    email: q.email ?? "",
    phone: q.phone ?? "",
    category: q.category ?? "",
  };
}

function toEditItems(items: QuoteRequestItem[]): EditItem[] {
  return items.map((item) => ({
    id: item.id,
    product_name_snapshot: item.product_name_snapshot,
    unit_price_snapshot: String(item.unit_price_snapshot),
    quantity: String(item.quantity),
  }));
}

export default function QuotesTab() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"All" | QuoteStatus>("All");
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Snapshot the "last seen" timestamp once, on mount, BEFORE we mark
  // the tab as seen. This is what lets us know which rows were newly
  // created since the admin's previous visit to this tab.
  const [lastSeenAt] = useState(() => getLastSeenQuotesAt());

  useEffect(() => {
    // Now that we've captured lastSeenAt above, reset the "seen"
    // timestamp so the sidebar badge clears immediately.
    markQuotesSeen();
  }, []);

  function isNewQuote(q: QuoteRequest) {
    return new Date(q.created_at).getTime() > new Date(lastSeenAt).getTime();
  }

  const activeCount = useMemo(
    () => quotes.filter((quote) => quote.status === "ACTIVE").length,
    [quotes]
  );

  const newCount = useMemo(
    () => quotes.filter((quote) => isNewQuote(quote)).length,
    [quotes, lastSeenAt]
  );

  // Live total for the edit-mode items table, recalculated from the
  // (possibly just-typed) price/quantity strings.
  const editItemsTotal = useMemo(() => {
    return editItems.reduce((sum, item) => {
      const price = parseFloat(item.unit_price_snapshot);
      const qty = parseFloat(item.quantity);
      if (Number.isNaN(price) || Number.isNaN(qty)) return sum;
      return sum + price * qty;
    }, 0);
  }, [editItems]);

  useEffect(() => {
    loadQuotes(activeFilter);
  }, [activeFilter]);

  async function loadQuotes(status: "All" | QuoteStatus) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await listQuotes(status === "All" ? undefined : status);
      setQuotes(response.items);
      setTotal(response.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les demandes de devis.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(quote: QuoteRequest, status: QuoteStatus) {
    setUpdatingId(quote.id);
    setErrorMessage(null);

    try {
      const updated = await updateQuote(quote.id, { status });
      setQuotes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelectedQuote((current) =>
        current?.id === updated.id ? updated : current
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de mettre à jour le statut du devis.");
    } finally {
      setUpdatingId(null);
    }
  }

  function openQuote(q: QuoteRequest) {
    setSelectedQuote(q);
    setEditMode(false);
    setEditForm(toEditForm(q));
    setEditItems(toEditItems(q.items));
  }

  function closeModal() {
    setSelectedQuote(null);
    setEditMode(false);
    setEditForm(null);
    setEditItems([]);
  }

  function updateEditItem(id: number, field: "unit_price_snapshot" | "quantity", value: string) {
    setEditItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function handleSaveEdit() {
    if (!selectedQuote || !editForm) return;
    if (!editForm.company.trim() || !editForm.contact_person.trim() || !editForm.email.trim()) {
      setErrorMessage("Société, contact et email sont obligatoires.");
      return;
    }

    // Validate items: price >= 0, quantity > 0, both must parse as numbers.
    const parsedItems: { id: number; unit_price_snapshot: number; quantity: number }[] = [];
    for (const item of editItems) {
      const price = parseFloat(item.unit_price_snapshot);
      const qty = parseFloat(item.quantity);
      if (Number.isNaN(price) || price < 0 || Number.isNaN(qty) || qty <= 0) {
        setErrorMessage(`Prix/quantité invalide pour "${item.product_name_snapshot}".`);
        return;
      }
      parsedItems.push({ id: item.id, unit_price_snapshot: price, quantity: Math.round(qty) });
    }

    setSavingEdit(true);
    setErrorMessage(null);
    try {
      const updated = await updateQuote(selectedQuote.id, {
        company: editForm.company.trim(),
        contact_person: editForm.contact_person.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        category: editForm.category.trim() || null,
        items: parsedItems.length > 0 ? parsedItems : undefined,
      });
      setQuotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedQuote(updated);
      setEditItems(toEditItems(updated.items));
      setEditMode(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Échec de la mise à jour de la commande.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(quote: QuoteRequest) {
    if (!confirm(`Supprimer la commande ${quote.reference} ? Cette action ne peut pas être annulée.`)) return;
    setDeletingId(quote.id);
    setErrorMessage(null);
    try {
      await deleteQuote(quote.id);
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
      setTotal((t) => Math.max(0, t - 1));
      if (selectedQuote?.id === quote.id) closeModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Échec de la suppression de la commande.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadPdf(quote: QuoteRequest) {
    setDownloadingId(quote.id);
    setErrorMessage(null);
    try {
      await downloadQuotePdf(quote.id, quote.order_number, quote.reference);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Échec du téléchargement du PDF.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {activeFilter === "All" ? total : quotes.length} demande
          {(activeFilter === "All" ? total : quotes.length) !== 1 ? "s" : ""}
          <span className="ml-2 text-xs">({activeCount} active{activeCount !== 1 ? "s" : ""} dans cette vue)</span>
          {newCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {newCount} nouvelle{newCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:border-primary text-muted-foreground"
              }`}
            >
              {STATUS_LABELS_FR[filter]}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {["N° Commande", "Client", "Catégorie", "Valeur", "Statut", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Chargement des demandes de devis...
                    </div>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune demande de devis trouvée.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  const isNew = isNewQuote(q);
                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${
                        isNew ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-secondary/40"
                      }`}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {isNew && (
                          <span className="inline-flex items-center gap-1 mr-2 text-[9px] font-bold text-red-600 align-middle">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            NOUVEAU
                          </span>
                        )}
                        {q.reference}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-foreground">{q.company}</div>
                        <div className="text-xs text-muted-foreground">{q.contact_person}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {q.category || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-foreground">
                        {formatMoney(q.estimated_value)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(q.status)}`}>
                          {STATUS_LABELS_FR[q.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openQuote(q)}
                            className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                          >
                            <Eye size={13} />
                            Voir
                          </button>
                          <select
                            value={q.status}
                            disabled={updatingId === q.id}
                            onChange={(event) => handleStatusChange(q, event.target.value as QuoteStatus)}
                            className="border border-border rounded-md px-2 py-1 text-xs bg-background text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS_FR[status]}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDownloadPdf(q)}
                            disabled={downloadingId === q.id}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary disabled:opacity-40"
                            title="Télécharger le PDF"
                          >
                            {downloadingId === q.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(q)}
                            disabled={deletingId === q.id}
                            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40"
                            title="Supprimer la commande"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedQuote && editForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">Commande {selectedQuote.reference}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedQuote.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Modifier
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-73px)]">
              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Société *</label>
                    <input
                      value={editForm.company}
                      onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Contact *</label>
                    <input
                      value={editForm.contact_person}
                      onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Email *</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Téléphone</label>
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Catégorie</label>
                    <input
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="sm:col-span-2 flex gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60"
                    >
                      {savingEdit ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditForm(toEditForm(selectedQuote));
                        setEditItems(toEditItems(selectedQuote.items));
                      }}
                      className="px-5 border border-border text-sm rounded-lg hover:border-primary transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Société</p>
                    <p className="font-semibold text-foreground">{selectedQuote.company}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contact</p>
                    <p className="font-semibold text-foreground">{selectedQuote.contact_person}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="font-semibold text-foreground">{selectedQuote.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                    <p className="font-semibold text-foreground">{selectedQuote.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Catégorie</p>
                    <p className="font-semibold text-foreground">{selectedQuote.category || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valeur estimée</p>
                    <p className="font-semibold text-foreground">{formatMoney(selectedQuote.estimated_value)}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Statut</p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedQuote, status)}
                      disabled={updatingId === selectedQuote.id}
                      className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                        selectedQuote.status === status
                          ? "bg-primary text-white border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {selectedQuote.status === status && <CheckCircle2 size={13} />}
                      {STATUS_LABELS_FR[status]}
                    </button>
                  ))}
                </div>
              </div>

              {selectedQuote.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Message</p>
                  <pre className="whitespace-pre-wrap text-sm bg-secondary rounded-lg p-3 text-foreground font-sans">
                    {selectedQuote.description}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Produits demandés</p>
                {selectedQuote.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
                    Aucun élément de ligne de produit joint.
                  </div>
                ) : editMode ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="text-left text-xs text-muted-foreground font-semibold px-3 py-2">Produit</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2 w-24">Qté</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2 w-32">Unité (TND)</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2 w-28">Ligne</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {editItems.map((item) => {
                          const price = parseFloat(item.unit_price_snapshot);
                          const qty = parseFloat(item.quantity);
                          const lineTotal = !Number.isNaN(price) && !Number.isNaN(qty) ? price * qty : null;
                          return (
                            <tr key={item.id}>
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.product_name_snapshot}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.quantity}
                                  onChange={(e) => updateEditItem(item.id, "quantity", e.target.value)}
                                  className="w-20 border border-border rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:border-primary"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.unit_price_snapshot}
                                  onChange={(e) => updateEditItem(item.id, "unit_price_snapshot", e.target.value)}
                                  className="w-24 border border-border rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:border-primary"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-foreground">
                                {lineTotal !== null ? formatMoney(lineTotal) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-secondary/60 border-t border-border">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-foreground">
                            {formatMoney(editItemsTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="text-left text-xs text-muted-foreground font-semibold px-3 py-2">Produit</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2">Qté</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2">Unité</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2">Ligne</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedQuote.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 font-medium text-foreground">
                              {item.product_name_snapshot}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatMoney(item.unit_price_snapshot)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-foreground">
                              {formatMoney(item.unit_price_snapshot * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => handleDownloadPdf(selectedQuote)}
                  disabled={downloadingId === selectedQuote.id}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {downloadingId === selectedQuote.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  Télécharger le PDF
                </button>
                <button
                  onClick={() => handleDelete(selectedQuote)}
                  disabled={deletingId === selectedQuote.id}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline disabled:opacity-60"
                >
                  <Trash2 size={13} /> Supprimer cette commande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
