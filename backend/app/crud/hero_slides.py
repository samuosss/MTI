import os
import uuid
import aiofiles
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.hero_slide import HeroSlide
from app.schemas.hero_slide import SlidePatch

UPLOAD_DIR = "uploads/banners"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_all(db: Session) -> List[HeroSlide]:
    return db.query(HeroSlide).order_by(HeroSlide.sort_order).all()


def get_active(db: Session) -> List[HeroSlide]:
    return (
        db.query(HeroSlide)
        .filter(HeroSlide.is_active == True)
        .order_by(HeroSlide.sort_order)
        .all()
    )


def get_by_id(db: Session, slide_id: int) -> Optional[HeroSlide]:
    return db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()


async def create(db: Session, file: UploadFile, sort_order: int, link_url: Optional[str] = None) -> HeroSlide:
    ext = os.path.splitext(file.filename or "img")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(path, "wb") as out:
        while chunk := await file.read(256 * 1024):
            await out.write(chunk)

    slide = HeroSlide(
        image_url=f"banners/{filename}",
        sort_order=sort_order,
        is_active=True,
        link_url=link_url,              # NEW
    )
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return slide

def patch(db: Session, slide: HeroSlide, payload: SlidePatch) -> HeroSlide:
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(slide, field, val)
    db.commit()
    db.refresh(slide)
    return slide


def delete(db: Session, slide: HeroSlide) -> None:
    full_path = os.path.join("uploads", slide.image_url)
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(slide)
    db.commit()