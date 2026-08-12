from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_customer, require_verified_customer
from app.crud import customer_activity as activity_crud
from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer_activity import (
    AddToCartRequest,
    AddToWishlistRequest,
    CartItemOut,
    CartItemQuantityUpdate,
    SavedProductOut,
)

wishlist_router = APIRouter(prefix="/api/customers/wishlist", tags=["Customer Wishlist"])
cart_router = APIRouter(prefix="/api/customers/cart", tags=["Customer Cart"])


# ── Wishlist ─────────────────────────────────────────────────────────────
# Unchanged — wishlisting isn't a purchase action, stays open to unverified customers.

@wishlist_router.get("", response_model=list[SavedProductOut])
def get_wishlist(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    return activity_crud.list_wishlist(db, current_customer.id)


@wishlist_router.post("", response_model=SavedProductOut, status_code=status.HTTP_201_CREATED)
def add_wishlist_item(
    data: AddToWishlistRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    return activity_crud.add_to_wishlist(db, current_customer.id, data.product_id)


@wishlist_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_wishlist_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    removed = activity_crud.remove_from_wishlist(db, current_customer.id, product_id)
    if not removed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not in wishlist")
    return


# ── Cart ─────────────────────────────────────────────────────────────────
# Adding is gated behind email verification (require_verified_customer) — it's the
# first step toward a purchase. Viewing/updating/removing stays open so an
# unverified customer isn't locked out of managing what's already in their cart.

@cart_router.get("", response_model=list[CartItemOut])
def get_cart(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    return activity_crud.list_cart(db, current_customer.id)


@cart_router.post("", response_model=CartItemOut, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    data: AddToCartRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(require_verified_customer),
):
    return activity_crud.add_to_cart(db, current_customer.id, data.product_id, data.quantity)


@cart_router.patch("/{product_id}", response_model=CartItemOut | None)
def update_cart_item(
    product_id: int,
    data: CartItemQuantityUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Sets an absolute quantity. Sending quantity=0 removes the item (returns null)."""
    cart_item = activity_crud.get_cart_item(db, current_customer.id, product_id)
    if cart_item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not in cart")
    return activity_crud.set_cart_item_quantity(db, cart_item, data.quantity)


@cart_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    removed = activity_crud.remove_from_cart(db, current_customer.id, product_id)
    if not removed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not in cart")
    return


@cart_router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Wipes the whole cart — call this after a quote/order is successfully placed."""
    activity_crud.clear_cart(db, current_customer.id)
    return