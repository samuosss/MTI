from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_admin
from app.models.user import AdminUser

from app.schemas.settings import SiteSettingsOut, SiteSettingsPatch
from app.crud import settings as settings_crud

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=SiteSettingsOut)
def read_settings_public(db: Session = Depends(get_db)):
    """Public — used by the storefront's maintenance gate and locale switcher."""
    return settings_crud.get_settings(db)


@router.get("/admin", response_model=SiteSettingsOut)
def read_settings_admin(
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
):
    return settings_crud.get_settings(db)


@router.patch("/admin", response_model=SiteSettingsOut)
def update_settings_admin(
    patch: SiteSettingsPatch,
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
):
    return settings_crud.update_settings(db, patch)