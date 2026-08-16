import io
import re
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.quote import QuoteRequest

# ── MTI Shop brand palette, sampled from the logo ──────────────────────────
PRIMARY_COLOR = colors.HexColor("#0B2F6B")   # deep navy blue (logo "MT")
ACCENT_COLOR = colors.HexColor("#F7941D")    # orange (logo "i" / arc)
LIGHT_BLUE = colors.HexColor("#1CA7EC")      # bright blue accent (logo arc)
LIGHT_GREY = colors.HexColor("#F5F6F8")

COMPANY_NAME = "MTI Shop"
COMPANY_ADDRESS = "Tunis, Tunisie"
COMPANY_CONTACT = "contact@mtishop.tn"

LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "logo.png"

HEADER_HEIGHT = 3.4 * cm
FOOTER_HEIGHT = 0.35 * cm


def _strip_tax_mentions(text: str) -> str:
    """Removes any sentence mentioning 'TVA' — the client only wants TTC shown."""
    if not text:
        return text
    # Drop any sentence-like fragment containing "TVA" (case-insensitive)
    cleaned = re.sub(r"[^.]*\bTVA\b[^.]*\.?", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned


def _make_header_footer(quote: QuoteRequest):
    """Returns a canvas callback drawing the branded header band + footer accent line."""

    order_label = f"DEVIS N° {quote.order_number}" if quote.order_number else "DEVIS"
    reference = quote.reference
    date_str = quote.created_at.strftime("%d/%m/%Y")

    def _draw(canvas, doc):
        canvas.saveState()
        page_w, page_h = A4

        # ── Top brand band ──────────────────────────────────────────────
        canvas.setFillColor(PRIMARY_COLOR)
        canvas.rect(0, page_h - HEADER_HEIGHT, page_w, HEADER_HEIGHT, fill=1, stroke=0)

        # thin orange accent under the band
        canvas.setFillColor(ACCENT_COLOR)
        canvas.rect(0, page_h - HEADER_HEIGHT - 0.12 * cm, page_w, 0.12 * cm, fill=1, stroke=0)

        # logo
        if LOGO_PATH.exists():
            logo_size = 2.5 * cm
            canvas.drawImage(
                str(LOGO_PATH),
                1.3 * cm,
                page_h - HEADER_HEIGHT / 2 - logo_size / 2,
                width=logo_size,
                height=logo_size,
                mask="auto",
                preserveAspectRatio=True,
            )
        text_x = 4.2 * cm

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 17)
        canvas.drawString(text_x, page_h - 1.5 * cm, COMPANY_NAME)
        canvas.setFont("Helvetica", 8.5)
        canvas.drawString(text_x, page_h - 2.15 * cm, f"{COMPANY_ADDRESS}  —  {COMPANY_CONTACT}")

        # devis info, right-aligned
        right_x = page_w - 1.3 * cm
        canvas.setFont("Helvetica-Bold", 14)
        canvas.drawRightString(right_x, page_h - 1.35 * cm, order_label)
        canvas.setFont("Helvetica", 8.5)
        canvas.drawRightString(right_x, page_h - 1.95 * cm, f"Réf. interne : {reference}")
        canvas.drawRightString(right_x, page_h - 2.4 * cm, f"Date : {date_str}")

        # ── Bottom accent line ───────────────────────────────────────────
        canvas.setFillColor(ACCENT_COLOR)
        canvas.rect(0, 0, page_w, FOOTER_HEIGHT, fill=1, stroke=0)

        canvas.restoreState()

    return _draw


def generate_quote_pdf(quote: QuoteRequest) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=HEADER_HEIGHT + 0.8 * cm,
        bottomMargin=1.2 * cm,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"], fontSize=9, textColor=colors.grey
    )
    normal_style = styles["Normal"]
    center_style = ParagraphStyle("Center", parent=normal_style, alignment=TA_CENTER)
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontSize=10,
        fontName="Helvetica-Bold",
        textColor=PRIMARY_COLOR,
        spaceAfter=4,
    )

    elements = []

    # ── Bloc client ──────────────────────────────────────────────────────
    client_lines = [
        f"<b>{quote.company}</b>",
        f"À l'attention de : {quote.contact_person}",
        f"Email : {quote.email}",
    ]
    if quote.phone:
        client_lines.append(f"Tél : {quote.phone}")

    client_table = Table(
        [[Paragraph("<br/>".join(client_lines), normal_style)]],
        colWidths=[17 * cm],
    )
    client_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
                ("LINEBELOW", (0, 0), (-1, -1), 2, ACCENT_COLOR),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    elements.append(client_table)
    elements.append(Spacer(1, 0.7 * cm))

    description = _strip_tax_mentions(quote.description or "")
    if description:
        elements.append(Paragraph("DESCRIPTION", section_title_style))
        elements.append(Paragraph(description, normal_style))
        elements.append(Spacer(1, 0.5 * cm))

    if quote.category:
        elements.append(
            Paragraph(f"<b>Catégorie :</b> {quote.category}", normal_style)
        )
        elements.append(Spacer(1, 0.5 * cm))

    # ── Tableau des articles (prix TTC) ────────────────────────────────
    if quote.items:
        elements.append(Paragraph("PRODUITS", section_title_style))

        data = [["Produit", "Qté", "PU TTC (TND)", "Total TTC (TND)"]]
        for item in quote.items:
            line_total = item.unit_price_snapshot * item.quantity
            data.append(
                [
                    item.product_name_snapshot,
                    str(item.quantity),
                    f"{item.unit_price_snapshot:,.3f}".replace(",", " "),
                    f"{line_total:,.3f}".replace(",", " "),
                ]
            )

        items_table = Table(data, colWidths=[8 * cm, 2 * cm, 3.5 * cm, 3.5 * cm])
        items_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        elements.append(items_table)
        elements.append(Spacer(1, 0.5 * cm))

    # ── Total TTC uniquement — pas de détail TVA ────────────────────────
    if quote.estimated_value:
        total_table = Table(
            [["TOTAL TTC", f"{quote.estimated_value:,.3f} TND".replace(",", " ")]],
            colWidths=[13.5 * cm, 3.5 * cm],
        )
        total_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 11),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_COLOR),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ]
            )
        )
        elements.append(total_table)

    elements.append(Spacer(1, 1.5 * cm))
    elements.append(
        Paragraph(
            "Ce devis est donné à titre indicatif et ne constitue pas une facture. "
            "Il est valable 30 jours à compter de sa date d'émission. Prix exprimés TTC.",
            label_style,
        )
    )
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(
        Paragraph(
            f"Généré le {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} — {COMPANY_NAME}",
            ParagraphStyle("Footer", parent=label_style, alignment=TA_CENTER),
        )
    )

    header_footer_fn = _make_header_footer(quote)
    doc.build(elements, onFirstPage=header_footer_fn, onLaterPages=header_footer_fn)
    buffer.seek(0)
    return buffer.read()