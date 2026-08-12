# app/schemas/hero_slide.py

from typing import Optional
from pydantic import BaseModel


class SlideOut(BaseModel):
    id: int
    image_url: str
    link_url: Optional[str] = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class SlidePatch(BaseModel):
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    link_url: Optional[str] = None