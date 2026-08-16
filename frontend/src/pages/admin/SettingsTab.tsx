import { useEffect, useState } from "react";
import {
  Loader2,
  Check,
  AlertTriangle,
  Wrench,
  DollarSign,
  Globe,
  Settings2,
} from "lucide-react";
import { getAdminSettings, updateSettings, SiteSettingsOut } from "../../api/settings";
import { ApiError } from "../../api/client";

// ── Reusable animated toggle switch ──────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  disabled,
  danger,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? (danger ? "bg-red-600" : "bg-primary") : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettingsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les paramètres."))
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const save = async (patch: Partial<SiteSettingsOut>) => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSettings(patch);
      setSettings(updated);
      flashSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Échec de l'enregistrement des paramètres.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCurrency = (code: string) => {
    if (!settings) return;
    const currencies = settings.currencies.map((c) =>
      c.code === code ? { ...c, enabled: !c.enabled } : c
    );
    setSettings({ ...settings, currencies });
    save({ currencies });
  };

  const toggleLanguage = (code: string) => {
    if (!settings) return;
    const languages = settings.languages.map((l) =>
      l.code === code ? { ...l, enabled: !l.enabled } : l
    );
    setSettings({ ...settings, languages });
    save({ languages });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-24">
        <Loader2 size={18} className="animate-spin" /> Chargement des paramètres…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-2xl bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
        <span>{error ?? "Impossible de charger les paramètres."}</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Settings2 size={20} className="text-primary" />
            Paramètres du site
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez le comportement global de la boutique MTI Shop.
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
            savedFlash
              ? "bg-green-100 text-green-700 opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <Check size={13} /> Enregistré
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Maintenance mode */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                settings.maintenance_enabled ? "bg-red-100 text-red-600" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Wrench size={19} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Mode maintenance</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Affiche aux clients une page de maintenance. La console d'administration reste toujours accessible.
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.maintenance_enabled}
            onChange={() => save({ maintenance_enabled: !settings.maintenance_enabled })}
            disabled={saving}
            danger
          />
        </div>

        {settings.maintenance_enabled && (
          <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="border-t border-border pt-4">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Message affiché aux visiteurs
              </label>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                rows={2}
                placeholder="Ex : Nous revenons très bientôt, merci de votre patience !"
                defaultValue={settings.maintenance_message ?? ""}
                onBlur={(e) => save({ maintenance_message: e.target.value || null })}
              />
            </div>
          </div>
        )}
      </section>

      {/* Currencies */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <DollarSign size={19} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Devises</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choisissez les devises disponibles sur la boutique.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {settings.currencies.map((c) => (
            <button
              key={c.code}
              onClick={() => toggleCurrency(c.code)}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                c.enabled
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-secondary/30 hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-sm font-bold ${c.enabled ? "text-primary" : "text-muted-foreground"}`}
                >
                  {c.symbol}
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{c.code}</div>
                  {c.code === settings.default_currency && (
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-accent">
                      Par défaut
                    </div>
                  )}
                </div>
              </div>
              <ToggleSwitch checked={c.enabled} onChange={() => toggleCurrency(c.code)} disabled={saving} />
            </button>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Globe size={19} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Langues</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choisissez les langues disponibles sur la boutique.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {settings.languages.map((l) => (
            <button
              key={l.code}
              onClick={() => toggleLanguage(l.code)}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                l.enabled
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-secondary/30 hover:border-primary/20"
              }`}
            >
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {l.label}
                  <span className="text-xs text-muted-foreground font-normal ml-1.5 uppercase">
                    {l.code}
                  </span>
                </div>
                {l.code === settings.default_language && (
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-accent">
                    Par défaut
                  </div>
                )}
              </div>
              <ToggleSwitch checked={l.enabled} onChange={() => toggleLanguage(l.code)} disabled={saving} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}