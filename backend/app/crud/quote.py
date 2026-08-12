import random
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.quote import QuoteRequest, QuoteRequestItem, QuoteStatus
from app.schemas.quote import QuoteRequestCreate, QuoteRequestUpdate


def generate_reference() -> str:
    return "QR-" + "".join(random.choices(string.digits, k=5))


def create_quote_request(
    db: Session,
    data: QuoteRequestCreate,
    attachment_path: str | None = None,
) -> QuoteRequest:
    reference = generate_reference()
    while db.scalar(select(QuoteRequest).where(QuoteRequest.reference == reference)):
        reference = generate_reference()

    quote = QuoteRequest(
        reference=reference,
        company=data.company,
        contact_person=data.contact_person,
        email=data.email,
        phone=data.phone,
        description=data.description,
        category=data.category,
        attachment_path=attachment_path,
        status=QuoteStatus.PENDING,
    )

    estimated_value = 0.0
    for item in data.items:
        product = db.get(Product, item.product_id)
        if product is None:
            continue
        quote.items.append(
            QuoteRequestItem(
                product_id=product.id,
                product_name_snapshot=product.name,
                unit_price_snapshot=product.price,
                quantity=item.quantity,
            )
        )
        estimated_value += product.price * item.quantity

    quote.estimated_value = estimated_value or None

    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def get_quote_request(db: Session, quote_id: int) -> QuoteRequest | None:
    return db.get(QuoteRequest, quote_id)


def list_quote_requests(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status: QuoteStatus | None = None,
) -> tuple[int, list[QuoteRequest]]:
    query = select(QuoteRequest)
    if status:
        query = query.where(QuoteRequest.status == status)
    query = query.order_by(QuoteRequest.created_at.desc())

    total = len(db.scalars(query).all())
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return total, list(items)


def update_quote_request(
    db: Session, quote: QuoteRequest, data: QuoteRequestUpdate
) -> QuoteRequest:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(quote, field, value)
    db.commit()
    db.refresh(quote)
    return quote
