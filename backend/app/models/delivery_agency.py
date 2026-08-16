# app/models/delivery_agency.py
from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, func

from app.database import Base


class DeliveryAgency(Base):
    __tablename__ = "delivery_agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    fee = Column(Numeric(10, 3), nullable=False, default=0)  # TND, 3 decimals
    eta = Column(String(60), nullable=True)  # e.g. "24-48h"
    active = Column(Boolean, nullable=False, default=True)  # whether customers see it at checkout
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())