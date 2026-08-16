import logging
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path

from app.config import settings

logger = logging.getLogger("email")

# Couleur de marque MTI — à ajuster si tu as une charte graphique précise
BRAND_COLOR = "#1a3d7c"
ACCENT_COLOR = "#F7941D"
BRAND_NAME = "MTI"

# Même logo que celui utilisé pour les PDF (app/services/quote_pdf.py) —
# intégré en pièce jointe "inline" (CID), jamais chargé depuis une URL externe.
# Une image distante est un déclencheur spam classique ; une image intégrée au
# message ne fait aucun appel réseau et ne pose donc aucun problème de délivrabilité.
LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "logo.png"
LOGO_CID = "mti-logo"


def _email_shell(title: str, body_html: str) -> str:
    """
    Enveloppe HTML : logo intégré en pièce jointe inline (CID) — pas d'appel réseau,
    donc pas de pénalité spam — avec un rendu propre et sobre.
    """
    logo_html = (
        f'<img src="cid:{LOGO_CID}" alt="{BRAND_NAME}" height="40" '
        f'style="height:40px; width:auto; display:block;" />'
        if LOGO_PATH.exists()
        else f'<span style="font-size:20px; font-weight:bold; color:{BRAND_COLOR};">{BRAND_NAME}</span>'
    )

    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#222222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; padding:28px 20px;">
      <tr>
        <td style="padding-bottom:16px;">
          {logo_html}
        </td>
      </tr>
      <tr>
        <td style="border-top:3px solid {ACCENT_COLOR}; font-size:0; line-height:0; padding:0;">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:24px 0; font-size:15px; line-height:1.6;">
          {body_html}
        </td>
      </tr>
      <tr>
        <td style="border-top:1px solid #e0e0e0; padding-top:14px; font-size:12px; color:#888888;">
          {BRAND_NAME} - mtishop.tn
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _button(url: str, label: str) -> str:
    return f"""\
<p style="margin:20px 0;">
  <a href="{url}" target="_blank"
     style="display:inline-block; padding:10px 24px; background-color:{BRAND_COLOR}; color:#ffffff;
            font-weight:bold; text-decoration:none; font-size:15px; border-radius:4px;">
    {label}
  </a>
</p>
<p style="font-size:12px; color:#999999; word-break:break-all;">
  Ou copiez ce lien dans votre navigateur : <a href="{url}" style="color:{BRAND_COLOR};">{url}</a>
</p>
"""


def _order_items_table_html(items: list[dict]) -> str:
    """items: [{"name": str, "quantity": int, "unit_price": float, "line_total": float}, ...]"""
    rows = "".join(
        f"""\
<tr>
  <td style="padding:6px 0; border-bottom:1px solid #eeeeee;">{i['name']}</td>
  <td style="padding:6px 0; border-bottom:1px solid #eeeeee; text-align:center;">{i['quantity']}</td>
  <td style="padding:6px 0; border-bottom:1px solid #eeeeee; text-align:right;">{i['unit_price']:.3f} TND</td>
  <td style="padding:6px 0; border-bottom:1px solid #eeeeee; text-align:right;">{i['line_total']:.3f} TND</td>
</tr>"""
        for i in items
    )
    return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; font-size:14px; border-collapse:collapse;">
  <tr>
    <td style="text-align:left; padding-bottom:6px; border-bottom:1px solid #cccccc; color:#666666; font-size:12px;">Produit</td>
    <td style="text-align:center; padding-bottom:6px; border-bottom:1px solid #cccccc; color:#666666; font-size:12px;">Qté</td>
    <td style="text-align:right; padding-bottom:6px; border-bottom:1px solid #cccccc; color:#666666; font-size:12px;">Prix</td>
    <td style="text-align:right; padding-bottom:6px; border-bottom:1px solid #cccccc; color:#666666; font-size:12px;">Total</td>
  </tr>
  {rows}
</table>
"""


def _send_email(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    """
    Sends an HTML email (with plain-text fallback) via SMTP using the configured
    'Mail professionnel' account. Falls back to logging/printing the plain text
    if SMTP_HOST isn't set yet — keeps local dev working without real mail credentials.
    """
    if not settings.SMTP_HOST:
        logger.warning(f"[DEV EMAIL] To: {to_email} | Subject: {subject}\n{text_body}")
        print(f"\n📧 [DEV EMAIL] To: {to_email}\nSubject: {subject}\n{text_body}\n")
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message["Reply-To"] = settings.SMTP_FROM_EMAIL
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=settings.SMTP_FROM_EMAIL.split("@")[-1] or "mtishop.tn")
    message.set_content(text_body)  # fallback texte brut
    message.add_alternative(html_body, subtype="html")  # version affichée par défaut

    # Embed the logo as an inline attachment (CID) referenced by the HTML body
    # above via cid:mti-logo — no external request, so no spam penalty.
    if LOGO_PATH.exists():
        try:
            html_part = message.get_body(preferencelist=("html",))
            with open(LOGO_PATH, "rb") as f:
                html_part.add_related(f.read(), maintype="image", subtype="png", cid=f"<{LOGO_CID}>")
        except Exception:
            logger.exception("Failed to embed logo image in outgoing email")

    smtp_port = int(settings.SMTP_PORT)

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, smtp_port, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, smtp_port, timeout=10) as server:
                if getattr(settings, "SMTP_USE_TLS", True):
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
    except Exception:
        logger.exception(f"Failed to send email to {to_email} (subject: {subject!r})")


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    text_body = (
        "Vous avez demandé la réinitialisation de votre mot de passe.\n\n"
        f"Cliquez sur ce lien pour choisir un nouveau mot de passe :\n{reset_link}\n\n"
        "Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, "
        "ignorez simplement cet email."
    )

    body_html = f"""\
<p><strong>Vous avez demandé la réinitialisation de votre mot de passe.</strong></p>
<p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
{_button(reset_link, "Réinitialiser mon mot de passe")}
<p><strong>Ce lien expire dans 30 minutes.</strong> Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
"""

    _send_email(
        to_email,
        subject="Réinitialisation de votre mot de passe - MTI",
        text_body=text_body,
        html_body=_email_shell("Réinitialisation de mot de passe", body_html),
    )


def send_verification_email(to_email: str, verify_link: str) -> None:
    text_body = (
        "Merci pour votre inscription sur MTI !\n\n"
        f"Cliquez sur ce lien pour vérifier votre adresse email :\n{verify_link}\n\n"
        "Ce lien expire dans 24 heures. Vous pouvez naviguer et vous connecter normalement "
        "en attendant, mais certaines actions (ajout au panier, achats) resteront limitées "
        "tant que l'email n'est pas vérifié."
    )

    body_html = f"""\
<p><strong>Merci pour votre inscription sur MTI !</strong></p>
<p>Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
{_button(verify_link, "Vérifier mon email")}
<p><strong>Ce lien expire dans 24 heures.</strong> Vous pouvez naviguer et vous connecter normalement en attendant,
mais certaines actions (ajout au panier, achats) resteront limitées tant que l'email n'est pas vérifié.</p>
"""

    _send_email(
        to_email,
        subject="Vérifiez votre adresse email - MTI",
        text_body=text_body,
        html_body=_email_shell("Vérification email", body_html),
    )


def send_order_confirmation_email(
    to_email: str,
    order_reference: str,
    company: str,
    contact_person: str,
    items: list[dict],
    total: float,
) -> None:
    """Sent to the customer right after they place an order from the cart."""
    text_lines = "\n".join(
        f"- {i['name']} x{i['quantity']} — {i['line_total']:.3f} TND" for i in items
    )
    text_body = (
        f"Merci pour votre commande, {contact_person} !\n\n"
        f"Référence commande : {order_reference}\n"
        f"Société : {company}\n\n"
        f"{text_lines}\n\n"
        f"Total estimé : {total:.3f} TND\n\n"
        "Notre équipe vous contactera sous peu pour confirmer les détails de livraison "
        "et de paiement."
    )

    body_html = f"""\
<p style="font-size:16px;"><strong>Merci pour votre commande, {contact_person} !</strong></p>
<p>Votre commande <strong style="color:{BRAND_COLOR};">{order_reference}</strong> a bien été reçue et est en cours de traitement.</p>
{_order_items_table_html(items)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
  <tr>
    <td style="text-align:right; font-size:16px; font-weight:bold; padding-top:8px; border-top:2px solid {BRAND_COLOR};">
      Total estimé : {total:.3f} TND
    </td>
  </tr>
</table>
<p style="margin-top:20px;">Notre équipe vous contactera sous peu pour confirmer les détails de livraison et de paiement.</p>
"""

    _send_email(
        to_email,
        subject=f"Confirmation de commande {order_reference} - MTI",
        text_body=text_body,
        html_body=_email_shell("Confirmation de commande", body_html),
    )


def send_admin_order_notification_email(
    order_reference: str,
    company: str,
    contact_person: str,
    customer_email: str,
    customer_phone: str | None,
    items: list[dict],
    total: float,
) -> None:
    """Sent to the single configured admin address on every new order."""
    admin_email = settings.ADMIN_NOTIFY_EMAIL
    if not admin_email:
        logger.warning(
            f"ADMIN_NOTIFY_EMAIL not set — skipping admin notification for order {order_reference}."
        )
        return

    text_lines = "\n".join(
        f"- {i['name']} x{i['quantity']} — {i['line_total']:.3f} TND" for i in items
    )
    text_body = (
        f"Nouvelle commande reçue : {order_reference}\n\n"
        f"Société : {company}\n"
        f"Contact : {contact_person}\n"
        f"Email : {customer_email}\n"
        f"Téléphone : {customer_phone or 'N/A'}\n\n"
        f"{text_lines}\n\n"
        f"Total estimé : {total:.3f} TND"
    )

    body_html = f"""\
<p style="font-size:16px;"><strong>Nouvelle commande reçue : <span style="color:{BRAND_COLOR};">{order_reference}</span></strong></p>
<p>
  Société : <strong>{company}</strong><br/>
  Contact : {contact_person}<br/>
  Email : {customer_email}<br/>
  Téléphone : {customer_phone or 'N/A'}
</p>
{_order_items_table_html(items)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
  <tr>
    <td style="text-align:right; font-size:16px; font-weight:bold; padding-top:8px; border-top:2px solid {BRAND_COLOR};">
      Total estimé : {total:.3f} TND
    </td>
  </tr>
</table>
"""

    _send_email(
        admin_email,
        subject=f"Nouvelle commande {order_reference} - MTI",
        text_body=text_body,
        html_body=_email_shell("Nouvelle commande", body_html),
    )