from sqlalchemy import Column, Integer, Boolean, Text, JSON, DateTime, func
from app.database import Base


class SiteSettings(Base):
    """Singleton row (id always = 1) holding all site-wide admin-configurable settings."""
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, default=1)

    maintenance_enabled = Column(Boolean, nullable=False, default=False)
    maintenance_message = Column(Text, nullable=True)

    currencies = Column(JSON, nullable=False, default=list)
    default_currency = Column(Text, nullable=False, default="TND")

    languages = Column(JSON, nullable=False, default=list)
    default_language = Column(Text, nullable=False, default="fr")

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())