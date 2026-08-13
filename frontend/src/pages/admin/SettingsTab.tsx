import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { getAdminSettings, updateSettings, SiteSettingsOut } from "../../api/settings";
import { ApiError } from "../../api/client";

export default function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettingsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
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
      setError(e instanceof ApiError ? e.message : "Failed to save settings");
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
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-6">
        <Loader2 size={16} className="animate-spin" /> Chargement des paramètres…
      </div>
    );
  }

  if (!settings) {
    return <div className="p-6 text-sm text-red-600">{error ?? "Impossible de charger les paramètres."}</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      {savedFlash && (
        <div className="flex items-center gap-1.5 text-xs text-green-700">
          <Check size={13} /> Enregistré
        </div>
      )}

      {/* Maintenance mode */}
      <section className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Mode maintenance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Affiche aux clients une page de maintenance. La console d'administration reste toujours accessible.
            </p>
          </div>
          <button
            onClick={() => save({ maintenance_enabled: !settings.maintenance_enabled })}
            disabled={saving}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              settings.maintenance_enabled
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-secondary text-foreground border border-border hover:bg-secondary/70"
            }`}
          >
            {settings.maintenance_enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <textarea
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary"
          rows={2}
          placeholder="Message shown to visitors (optional)"
          defaultValue={settings.maintenance_message ?? ""}
          onBlur={(e) => save({ maintenance_message: e.target.value || null })}
        />
      </section>

      {/* Currencies */}
      <section className="bg-white border border-border rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Currencies</h3>
        <div className="space-y-2">
          {settings.currencies.map((c) => (
            <label key={c.code} className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() => toggleCurrency(c.code)}
                className="accent-primary"
              />
              <span>
                {c.code} ({c.symbol})
                {c.code === settings.default_currency && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">default</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="bg-white border border-border rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Languages</h3>
        <div className="space-y-2">
          {settings.languages.map((l) => (
            <label key={l.code} className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={l.enabled}
                onChange={() => toggleLanguage(l.code)}
                className="accent-primary"
              />
              <span>
                {l.label} ({l.code})
                {l.code === settings.default_language && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">default</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}