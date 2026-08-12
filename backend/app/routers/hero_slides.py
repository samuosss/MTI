from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.hero_slide import SlideOut, SlidePatch
from app.core.deps import get_current_admin
from app.models.user import AdminUser
import app.crud.hero_slides as crud

router = APIRouter(prefix="/api/hero-slides", tags=["Hero Slides"])


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[SlideOut])
def list_public(db: Session = Depends(get_db)):
    return crud.get_active(db)


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin", response_model=List[SlideOut])
def list_admin(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    return crud.get_all(db)


@router.post("/admin", response_model=SlideOut, status_code=status.HTTP_201_CREATED)
async def create_slide(
    file: UploadFile = File(...),
    sort_order: int = Form(0),
    link_url: Optional[str] = Form(None),          # NEW
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only image files are accepted.")
    return await crud.create(db, file, sort_order, link_url)   # pass it through


@router.patch("/admin/{slide_id}", response_model=SlideOut)
def patch_slide(
    slide_id: int,
    payload: SlidePatch,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    slide = crud.get_by_id(db, slide_id)
    if not slide:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found.")
    return crud.patch(db, slide, payload)


@router.delete("/admin/{slide_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slide(
    slide_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    slide = crud.get_by_id(db, slide_id)
    if not slide:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found.")
    crud.delete(db, slide)