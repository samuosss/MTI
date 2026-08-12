# app/models/hero_slide.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base


class HeroSlide(Base):
    __tablename__ = "hero_slides"

    id          = Column(Integer, primary_key=True, index=True)
    image_url   = Column(String, nullable=False)   # "banners/abc.jpg" — served via /static/
    link_url    = Column(String, nullable=True)
    sort_order  = Column(Integer, default=0, nullable=False)
    is_active   = Column(Boolean, default=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())