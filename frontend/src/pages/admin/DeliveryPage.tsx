import { useEffect, useState } from "react";
import { Truck, Plus, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import {
  listAllDeliveryAgencies,
  createDeliveryAgency,
  updateDeliveryAgency,
  deleteDeliveryAgency,
  type DeliveryAgencyOut,
  type DeliveryAgencyInput,
} from "../../api/delivery";

const emptyForm: DeliveryAgencyInput = { name: "", fee: 7, eta: "", active: true, sort_order: 0 };

function AgencyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: DeliveryAgencyOut | null;
  onClose: () => void;
  onSaved: (agency: DeliveryAgencyOut) => void;
}) {
  const [form, setForm] = useState<DeliveryAgencyInput>(
    initial
      ? { name: initial.name, fee: initial.fee, eta: initial.eta ?? "", active: initial.active, sort_order: initial.sort_order }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    if (form.fee < 0) { setError("Le tarif doit être positif."); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = initial
        ? await updateDeliveryAgency(initial.id, form)
        : await createDeliveryAgency(form);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">{initial ? "Modifier l'agence" : "Nouvelle agence de livraison"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Aramex"
              className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frais (TND)</label>
              <input
                type="number"
                min={0}
                step="0.001"
                value={form.fee}
                onChange={(e) => setForm((f) => ({ ...f, fee: Number(e.target.value) }))}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Délai</label>
              <input
                value={form.eta ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))}
                placeholder="Ex: 24-48h"
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="accent-primary"
            />
            Visible pour les clients au moment de la commande
          </label>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {initial ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const [agencies, setAgencies] = useState<DeliveryAgencyOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<"closed" | "create" | DeliveryAgencyOut>("closed");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function loadAgencies() {
    setLoading(true);
    setLoadError(null);
    listAllDeliveryAgencies()
      .then(setAgencies)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Impossible de charger les agences."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAgencies();
  }, []);

  function handleSaved(agency: DeliveryAgencyOut) {
    setAgencies((prev) => {
      const exists = prev.some((a) => a.id === agency.id);
      return exists ? prev.map((a) => (a.id === agency.id ? agency : a)) : [...prev, agency];
    });
    setModalState("closed");
  }

  async function handleToggleActive(agency: DeliveryAgencyOut) {
    const updated = await updateDeliveryAgency(agency.id, { active: !agency.active });
    setAgencies((prev) => prev.map((a) => (a.id === agency.id ? updated : a)));
  }

  async function handleDelete(agency: DeliveryAgencyOut) {
    if (!confirm(`Supprimer "${agency.name}" ? Cette action est irréversible.`)) return;
    setDeletingId(agency.id);
    try {
      await deleteDeliveryAgency(agency.id);
      setAgencies((prev) => prev.filter((a) => a.id !== agency.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Truck size={18} className="text-primary" /> Agences de livraison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les transporteurs disponibles pour vos clients au moment de la commande, ainsi que leurs frais.
          </p>
        </div>
        <button
          onClick={() => setModalState("create")}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-900 transition-colors"
        >
          <Plus size={16} /> Ajouter une agence
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : loadError ? (
          <div className="p-6 flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {loadError}
          </div>
        ) : agencies.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">
            Aucune agence pour le moment. Ajoutez-en une pour l'afficher au client dans son panier.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Frais</th>
                <th className="px-4 py-3">Délai</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => (
                <tr key={agency.id} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{agency.name}</td>
                  <td className="px-4 py-3">{Number(agency.fee).toFixed(3)} TND</td>
                  <td className="px-4 py-3 text-muted-foreground">{agency.eta || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(agency)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        agency.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-secondary text-muted-foreground hover:bg-border"
                      }`}
                    >
                      {agency.active ? "Visible" : "Masquée"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalState(agency)}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(agency)}
                        disabled={deletingId === agency.id}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deletingId === agency.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalState !== "closed" && (
        <AgencyModal
          initial={modalState === "create" ? null : modalState}
          onClose={() => setModalState("closed")}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
