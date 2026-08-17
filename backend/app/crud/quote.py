import random
import string

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.quote import QuoteRequest, QuoteRequestItem, QuoteStatus
from app.schemas.quote import QuoteRequestCreate, QuoteRequestUpdate

ORDER_NUMBER_START = 26001


def generate_reference() -> str:
    return "QR-" + "".join(random.choices(string.digits, k=5))


def _next_order_number(db: Session) -> int:
    current_max = db.scalar(select(func.max(QuoteRequest.order_number)))
    return (current_max + 1) if current_max else ORDER_NUMBER_START


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
        order_number=_next_order_number(db),
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
    update_data = data.model_dump(exclude_unset=True)

    # Line items live on a related table, not as plain columns on
    # QuoteRequest, so they're applied separately (matched by id).
    items_data = update_data.pop("items", None)

    for field, value in update_data.items():
        setattr(quote, field, value)

    if items_data is not None:
        items_by_id = {item.id: item for item in quote.items}
        for item_update in items_data:
            item = items_by_id.get(item_update["id"])
            if item is None:
                continue
            item.unit_price_snapshot = item_update["unit_price_snapshot"]
            item.quantity = item_update["quantity"]

        # Recalculate the order total from the (possibly edited) line
        # items, unless the caller explicitly passed its own
        # estimated_value in the same request.
        if "estimated_value" not in update_data:
            recalculated = sum(i.unit_price_snapshot * i.quantity for i in quote.items)
            quote.estimated_value = recalculated or None

    db.commit()
    db.refresh(quote)
    return quote


def delete_quote_request(db: Session, quote: QuoteRequest) -> None:
    # `items` cascade="all, delete-orphan" on the relationship handles line items automatically.
    db.delete(quote)
    db.commit()
