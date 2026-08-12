import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import Footer from "../components/layout/Footer";
import { verifyEmail } from "../api/customerAuth";
import { ApiError } from "../api/client";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const calledOnce = useRef(false);

  useEffect(() => {
    if (calledOnce.current) return; // avoid double-call in React StrictMode dev
    calledOnce.current = true;

    if (!token) {
      setStatus("error");
      setError("Lien de vérification invalide ou manquant.");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Une erreur est survenue. Le lien a peut-être expiré."
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6">
          {status === "loading" && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <Loader2 size={26} className="text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Vérification en cours…</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle size={26} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Email vérifié</h2>
              <p className="text-sm text-muted-foreground">
                Votre adresse email est confirmée. Vous avez maintenant accès à toutes les
                fonctionnalités du site.
              </p>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-900 transition-colors mt-2 text-sm"
              >
                Retour à l'accueil <ArrowRight size={15} />
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle size={26} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Lien invalide</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-sm text-muted-foreground">
                Connectez-vous pour demander un nouveau lien de vérification.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-900 transition-colors mt-2 text-sm"
              >
                Se connecter <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}