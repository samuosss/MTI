# app/schemas/delivery_agency.py
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class DeliveryAgencyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    fee: Decimal = Field(..., ge=0)
    eta: Optional[str] = Field(None, max_length=60)
    active: bool = True
    sort_order: int = 0


class DeliveryAgencyCreate(DeliveryAgencyBase):
    pass


class DeliveryAgencyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    fee: Optional[Decimal] = Field(None, ge=0)
    eta: Optional[str] = Field(None, max_length=60)
    active: Optional[bool] = None
    sort_order: Optional[int] = None


class DeliveryAgencyOut(DeliveryAgencyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True