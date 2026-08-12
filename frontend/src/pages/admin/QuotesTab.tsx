import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, Loader2, X } from "lucide-react";
import {
  listQuotes,
  updateQuote,
  type QuoteRequest,
  type QuoteStatus,
} from "../../api/quotes";

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

function statusClass(status: QuoteStatus) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "PENDING") return "bg-orange-100 text-orange-600";
  if (status === "COMPLETED") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-600";
}

function formatMoney(value: number | null | undefined) {
  return `${(value ?? 0).toLocaleString()} TND`;
}

export default function QuotesTab() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"All" | QuoteStatus>("All");
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCount = useMemo(
    () => quotes.filter((quote) => quote.status === "ACTIVE").length,
    [quotes]
  );

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
      setErrorMessage(error instanceof Error ? error.message : "Unable to load quote requests.");
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
      setErrorMessage(error instanceof Error ? error.message : "Unable to update quote status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {activeFilter === "All" ? total : quotes.length} request
          {(activeFilter === "All" ? total : quotes.length) !== 1 ? "s" : ""}
          <span className="ml-2 text-xs">({activeCount} active in this view)</span>
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
              {filter}
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
                {["Request ID", "Customer", "Product Category", "Value", "Status", "Actions"].map((h) => (
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
                      Loading quote requests...
                    </div>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No quote requests found.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
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
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedQuote(q)}
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <select
                          value={q.status}
                          disabled={updatingId === q.id}
                          onChange={(event) => handleStatusChange(q, event.target.value as QuoteStatus)}
                          className="border border-border rounded-md px-2 py-1 text-xs bg-background text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">Quote {selectedQuote.reference}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedQuote.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-73px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Company</p>
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
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="font-semibold text-foreground">{selectedQuote.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <p className="font-semibold text-foreground">{selectedQuote.category || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                  <p className="font-semibold text-foreground">{formatMoney(selectedQuote.estimated_value)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Status</p>
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
                      {status}
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
                <p className="text-xs text-muted-foreground mb-2">Requested Products</p>
                {selectedQuote.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
                    No product line items attached.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="text-left text-xs text-muted-foreground font-semibold px-3 py-2">Product</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2">Qty</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2">Unit</th>
                          <th className="text-right text-xs text-muted-foreground font-semibold px-3 py-2">Line</th>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
