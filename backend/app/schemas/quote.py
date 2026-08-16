from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.quote import QuoteStatus


class QuoteItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class QuoteItemOut(BaseModel):
    id: int
    product_id: int | None
    product_name_snapshot: str
    unit_price_snapshot: float
    quantity: int

    class Config:
        from_attributes = True


class QuoteRequestCreate(BaseModel):
    company: str
    contact_person: str
    email: EmailStr
    phone: str | None = None
    description: str | None = None
    category: str | None = None
    items: list[QuoteItemIn] = Field(default_factory=list)


class QuoteRequestUpdate(BaseModel):
    """Used by the admin dashboard to edit a quote/order.
    All fields optional — only fields actually sent are updated (exclude_unset)."""

    status: QuoteStatus | None = None
    estimated_value: float | None = None
    company: str | None = None
    contact_person: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    description: str | None = None
    category: str | None = None


class QuoteRequestOut(BaseModel):
    id: int
    reference: str
    order_number: int | None = None
    company: str
    contact_person: str
    email: EmailStr
    phone: str | None
    description: str | None
    category: str | None
    attachment_path: str | None
    estimated_value: float | None
    status: QuoteStatus
    items: list[QuoteItemOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuoteRequestListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[QuoteRequestOut]