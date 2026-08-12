import { useEffect, useState } from "react";
import { getPublicSettings } from "../api/settings";
import MaintenancePage from "../pages/MaintenancePage";

interface MaintenanceState {
  enabled: boolean;
  message: string | null;
  imageUrl: string | null;
}

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    enabled: false,
    message: null,
    imageUrl: null,
  });

  // Bypass : un admin déjà connecté ne doit jamais être bloqué par la page de maintenance,
  // sinon personne ne peut désactiver le mode maintenance une fois activé.
  // Simple check localStorage — pas besoin d'un contexte dédié, cohérent avec le reste
  // de l'admin (mti_admin_token est déjà la clé utilisée ailleurs dans le projet).
  const isAdmin = !!localStorage.getItem("mti_admin_token");

  useEffect(() => {
    let cancelled = false;
    getPublicSettings()
      .then((s) => {
        if (!cancelled) {
          setMaintenance({
            enabled: s.maintenance_enabled,
            message: s.maintenance_message,
            imageUrl: s.maintenance_image_url ?? null,
          });
        }
      })
      .catch(() => {
        // if settings fail to load, fail open — don't lock customers out over a network blip
        if (!cancelled) setMaintenance({ enabled: false, message: null, imageUrl: null });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null; // ou un spinner si tu préfères
  if (maintenance.enabled && !isAdmin) {
    return <MaintenancePage message={maintenance.message} imageUrl={maintenance.imageUrl} />;
  }
  return <>{children}</>;
}