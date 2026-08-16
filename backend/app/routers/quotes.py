import io
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import get_current_admin, require_admin_role
from app.crud import quote as quote_crud
from app.database import get_db
from app.models.quote import QuoteStatus
from app.models.user import AdminUser
from app.schemas.quote import (
    QuoteItemIn,
    QuoteRequestCreate,
    QuoteRequestListResponse,
    QuoteRequestOut,
    QuoteRequestUpdate,
)
from app.services.email import send_admin_order_notification_email, send_order_confirmation_email
from app.services.quote_pdf import generate_quote_pdf

router = APIRouter(prefix="/api/quotes", tags=["Quote Requests"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx"}


def _save_attachment(file: UploadFile) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    upload_dir = Path(settings.UPLOAD_DIR) / "quotes"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    destination = upload_dir / filename
    with destination.open("wb") as f:
        f.write(file.file.read())

    return str(destination)


# ── Public endpoint: matches the "Quote Request Form" on the /quote page ──────


@router.post("", response_model=QuoteRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_quote_request(
    background_tasks: BackgroundTasks,
    company: str = Form(...),
    contact_person: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(None),
    description: str | None = Form(None),
    category: str | None = Form(None),
    items: str | None = Form(None, description='JSON list, e.g. [{"product_id":1,"quantity":2}]'),
    attachment: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    parsed_items: list[QuoteItemIn] = []
    if items:
        try:
            parsed_items = [QuoteItemIn(**i) for i in json.loads(items)]
        except (json.JSONDecodeError, TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 'items' JSON payload"
            )

    data = QuoteRequestCreate(
        company=company,
        contact_person=contact_person,
        email=email,
        phone=phone,
        description=description,
        category=category,
        items=parsed_items,
    )

    attachment_path = _save_attachment(attachment) if attachment is not None else None
    quote = quote_crud.create_quote_request(db, data, attachment_path)

    # Fire off customer + admin notification emails without blocking the response.
    email_items = [
        {
            "name": item.product_name_snapshot,
            "quantity": item.quantity,
            "unit_price": item.unit_price_snapshot,
            "line_total": item.unit_price_snapshot * item.quantity,
        }
        for item in quote.items
    ]
    total = quote.estimated_value or 0.0

    background_tasks.add_task(
        send_order_confirmation_email,
        quote.email,
        quote.reference,
        quote.company,
        quote.contact_person,
        email_items,
        total,
    )
    background_tasks.add_task(
        send_admin_order_notification_email,
        quote.reference,
        quote.company,
        quote.contact_person,
        quote.email,
        quote.phone,
        email_items,
        total,
    )

    return quote


# ── Admin/moderator endpoints (read) — powers the "Quote Requests" dashboard tab ──


@router.get("", response_model=QuoteRequestListResponse)
def list_quote_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: QuoteStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    total, items = quote_crud.list_quote_requests(db, page, page_size, status_filter)
    return QuoteRequestListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{quote_id}", response_model=QuoteRequestOut)
def get_quote_request(
    quote_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    quote = quote_crud.get_quote_request(db, quote_id)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    return quote


@router.get("/{quote_id}/pdf")
def download_quote_pdf(
    quote_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    quote = quote_crud.get_quote_request(db, quote_id)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    pdf_bytes = generate_quote_pdf(quote)
    filename = f"commande-{quote.order_number or quote.reference}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ── Admin-only endpoints (write) — moderators cannot edit or delete quotes ──


@router.patch("/{quote_id}", response_model=QuoteRequestOut)
def update_quote_request(
    quote_id: int,
    data: QuoteRequestUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    quote = quote_crud.get_quote_request(db, quote_id)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    return quote_crud.update_quote_request(db, quote, data)


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote_request(
    quote_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    quote = quote_crud.get_quote_request(db, quote_id)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    quote_crud.delete_quote_request(db, quote)