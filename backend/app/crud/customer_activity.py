from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.customer_activity import CartItem, SavedProduct


# ── Wishlist ─────────────────────────────────────────────────────────────

def list_wishlist(db: Session, customer_id: int) -> list[SavedProduct]:
    query = (
        select(SavedProduct)
        .options(joinedload(SavedProduct.product))
        .where(SavedProduct.customer_id == customer_id)
        .order_by(SavedProduct.created_at.desc())
    )
    return db.scalars(query).unique().all()


def get_saved_product(db: Session, customer_id: int, product_id: int) -> SavedProduct | None:
    query = select(SavedProduct).where(
        SavedProduct.customer_id == customer_id, SavedProduct.product_id == product_id
    )
    return db.scalar(query)


def add_to_wishlist(db: Session, customer_id: int, product_id: int) -> SavedProduct:
    existing = get_saved_product(db, customer_id, product_id)
    if existing is not None:
        return existing  # idempotent — already saved
    entry = SavedProduct(customer_id=customer_id, product_id=product_id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def remove_from_wishlist(db: Session, customer_id: int, product_id: int) -> bool:
    existing = get_saved_product(db, customer_id, product_id)
    if existing is None:
        return False
    db.delete(existing)
    db.commit()
    return True


# ── Cart ─────────────────────────────────────────────────────────────────

def list_cart(db: Session, customer_id: int) -> list[CartItem]:
    query = (
        select(CartItem)
        .options(joinedload(CartItem.product))
        .where(CartItem.customer_id == customer_id)
        .order_by(CartItem.created_at.asc())
    )
    return db.scalars(query).unique().all()


def get_cart_item(db: Session, customer_id: int, product_id: int) -> CartItem | None:
    query = select(CartItem).where(
        CartItem.customer_id == customer_id, CartItem.product_id == product_id
    )
    return db.scalar(query)


def add_to_cart(db: Session, customer_id: int, product_id: int, quantity: int) -> CartItem:
    """Adds a new line, or increments quantity if the product is already in the cart."""
    existing = get_cart_item(db, customer_id, product_id)
    if existing is not None:
        existing.quantity += quantity
        db.commit()
        db.refresh(existing)
        return existing

    item = CartItem(customer_id=customer_id, product_id=product_id, quantity=quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def set_cart_item_quantity(db: Session, cart_item: CartItem, quantity: int) -> CartItem | None:
    """Sets an absolute quantity. quantity=0 deletes the line and returns None."""
    if quantity <= 0:
        db.delete(cart_item)
        db.commit()
        return None
    cart_item.quantity = quantity
    db.commit()
    db.refresh(cart_item)
    return cart_item


def remove_from_cart(db: Session, customer_id: int, product_id: int) -> bool:
    existing = get_cart_item(db, customer_id, product_id)
    if existing is None:
        return False
    db.delete(existing)
    db.commit()
    return True


def clear_cart(db: Session, customer_id: int) -> None:
    """Wipes the cart, e.g. after a quote/order is successfully submitted."""
    items = db.scalars(select(CartItem).where(CartItem.customer_id == customer_id)).all()
    for item in items:
        db.delete(item)
    db.commit()