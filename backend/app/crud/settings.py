from sqlalchemy.orm import Session
from app.models.site_setting import SiteSettings
from app.schemas.settings import SiteSettingsPatch

DEFAULT_CURRENCIES = [
    {"code": "TND", "symbol": "DT", "enabled": True, "rate": 1.0},
    {"code": "EUR", "symbol": "€", "enabled": False, "rate": 0.30},
    {"code": "USD", "symbol": "$", "enabled": False, "rate": 0.32},
]

DEFAULT_LANGUAGES = [
    {"code": "fr", "label": "Français", "enabled": True},
    {"code": "en", "label": "English", "enabled": True},
    {"code": "ar", "label": "العربية", "enabled": False},
]


def get_settings(db: Session) -> SiteSettings:
    settings = db.query(SiteSettings).filter(SiteSettings.id == 1).first()
    if settings is None:
        settings = SiteSettings(
            id=1,
            maintenance_enabled=False,
            maintenance_message=None,
            currencies=DEFAULT_CURRENCIES,
            default_currency="TND",
            languages=DEFAULT_LANGUAGES,
            default_language="fr",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, patch: SiteSettingsPatch) -> SiteSettings:
    settings = get_settings(db)
    data = patch.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in ("currencies", "languages") and value is not None:
            value = [item if isinstance(item, dict) else item.model_dump() for item in value]
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings