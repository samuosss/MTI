from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SavedProduct(Base):
    """Wishlist entry. One row per (customer, product)."""

    __tablename__ = "saved_products"
    __table_args__ = (UniqueConstraint("customer_id", "product_id", name="uq_customer_product_saved"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    product: Mapped["Product"] = relationship()  # noqa: F821 — Product defined in app.models.product


class CartItem(Base):
    """Persisted cart line. One row per (customer, product); quantity holds the count."""

    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("customer_id", "product_id", name="uq_customer_product_cart"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    product: Mapped["Product"] = relationship()  # noqa: F821 — Product defined in app.models.product