import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("email")

# Couleur de marque MTI — à ajuster si tu as une charte graphique précise
BRAND_COLOR = "#1a3d7c"
BRAND_NAME = "MTI"
BRAND_LOGO_URL = "https://mtishop.tn/images/Logo.png"


def _email_shell(title: str, body_html: str) -> str:
    """
    Enveloppe HTML commune : bannière en haut + contenu au centre.
    Volontairement en inline styles (les clients mail ignorent souvent les <style> externes).
    """
    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f4f4f7; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e5e5e5;">
            <tr>
              <td style="background-color:#ffffff; padding:28px 32px 20px; text-align:center;">
                <img src="{BRAND_LOGO_URL}" alt="{BRAND_NAME}" height="64"
                     style="height:64px; width:auto; display:inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:{BRAND_COLOR}; height:4px; padding:0; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px; color:#222222; font-size:15px; line-height:1.6;">
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background-color:#fafafa; border-top:1px solid #eeeeee;">
                <span style="color:#999999; font-size:12px;">{BRAND_NAME} — mtishop.tn</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _button(url: str, label: str) -> str:
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:6px; background-color:{BRAND_COLOR};">
      <a href="{url}" target="_blank"
         style="display:inline-block; padding:12px 28px; color:#ffffff; font-weight:bold;
                text-decoration:none; font-size:15px; border-radius:6px;">
        {label}
      </a>
    </td>
  </tr>
</table>
<p style="font-size:12px; color:#999999; word-break:break-all;">
  Ou copiez ce lien dans votre navigateur : <a href="{url}" style="color:{BRAND_COLOR};">{url}</a>
</p>
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
    message.set_content(text_body)  # fallback texte brut
    message.add_alternative(html_body, subtype="html")  # version affichée par défaut

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
        subject="Réinitialisation de votre mot de passe — MTI",
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
        subject="Vérifiez votre adresse email — MTI",
        text_body=text_body,
        html_body=_email_shell("Vérification email", body_html),
    )