from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ServiceInquiry(Base):
    """Maps to the contact form on the /services page ('Start Your Technical Journey')."""

    __tablename__ = "service_inquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_email: Mapped[str] = mapped_column(String(255), nullable=False)
    service_interest: Mapped[str] = mapped_column(String(255), nullable=False)
    project_scope: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
