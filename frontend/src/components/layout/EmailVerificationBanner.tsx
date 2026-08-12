import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { resendVerification } from "../../api/customerAuth";
import { ApiError } from "../../api/client";

interface EmailVerificationBannerProps {
  /** Pass the currently logged-in customer, or null/undefined if logged out. */
  customer: { is_verified: boolean } | null | undefined;
}

/**
 * Persistent nudge shown while a logged-in customer hasn't verified their email yet.
 * Renders nothing if there's no customer or they're already verified.
 * Drop this near the top of your layout (e.g. right under <Nav />).
 */
export default function EmailVerificationBanner({ customer }: EmailVerificationBannerProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!customer || customer.is_verified) return null;

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      await resendVerification();
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 text-sm text-amber-900">
        <Mail size={15} className="flex-shrink-0" />
        {sent ? (
          <span className="flex items-center gap-1.5">
            <CheckCircle size={14} className="text-green-600" />
            Email de vérification renvoyé — pensez à vérifier vos spams.
          </span>
        ) : (
          <>
            <span>Vérifiez votre adresse email pour débloquer les achats.</span>
            <button
              onClick={handleResend}
              disabled={sending}
              className="font-semibold underline hover:no-underline disabled:opacity-60 flex items-center gap-1"
            >
              {sending && <Loader2 size={13} className="animate-spin" />}
              Renvoyer l'email
            </button>
          </>
        )}
        {error && <span className="text-red-700">{error}</span>}
      </div>
    </div>
  );
}