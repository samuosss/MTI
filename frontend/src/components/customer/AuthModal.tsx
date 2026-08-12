import { useState, type FormEvent } from "react";
import { X, Loader2, AlertCircle, CheckCircle, User, Mail, Lock } from "lucide-react";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { forgotPassword } from "../../api/customerAuth";
import { ApiError } from "../../api/client";

function FieldInput({
  icon: Icon, type = "text", placeholder, value, onChange, required = true,
}: {
  icon: React.ElementType; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}

export default function AuthModal() {
  const { isOpen, mode, setMode, closeAuthModal } = useAuthModal();
  const { login, signup } = useCustomerAuth();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  if (!isOpen) return null;

  function resetFields() {
    setEmail(""); setFullName(""); setPassword("");
    setError(null); setForgotSent(false);
  }

  function switchMode(next: typeof mode) {
    resetFields();
    setMode(next);
  }

  function handleClose() {
    resetFields();
    closeAuthModal();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        handleClose();
      } else if (mode === "signup") {
        await signup(email, fullName, password);
        handleClose();
      } else if (mode === "forgot-password") {
        await forgotPassword(email);
        setForgotSent(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {mode === "login" && "Connexion"}
            {mode === "signup" && "Créer un compte"}
            {mode === "forgot-password" && "Mot de passe oublié"}
          </h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {mode !== "forgot-password" && (
            <div className="flex gap-1 mb-5 bg-secondary rounded-lg p-1">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 text-sm font-semibold py-2 rounded-md transition-colors ${
                  mode === "login" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                Se connecter
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 text-sm font-semibold py-2 rounded-md transition-colors ${
                  mode === "signup" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                S'inscrire
              </button>
            </div>
          )}

          {mode === "forgot-password" && forgotSent ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle size={26} className="text-green-600" />
              </div>
              <p className="text-sm text-foreground font-semibold">Email envoyé</p>
              <p className="text-xs text-muted-foreground">
                Si un compte existe pour {email}, un lien de réinitialisation a été envoyé.
              </p>
              <button
                onClick={() => switchMode("login")}
                className="text-sm text-primary font-medium hover:underline mt-1"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <FieldInput icon={User} placeholder="Nom complet" value={fullName} onChange={setFullName} />
              )}
              <FieldInput icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} />
              {mode !== "forgot-password" && (
                <FieldInput
                  icon={Lock}
                  type="password"
                  placeholder={mode === "signup" ? "Mot de passe (8 caractères min.)" : "Mot de passe"}
                  value={password}
                  onChange={setPassword}
                />
              )}

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot-password")}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-1"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Veuillez patienter…</>
                ) : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              </button>

              {mode === "forgot-password" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Retour à la connexion
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}