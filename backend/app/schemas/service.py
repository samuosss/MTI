from datetime import datetime

from pydantic import BaseModel, EmailStr


class ServiceInquiryCreate(BaseModel):
    full_name: str
    company_email: EmailStr
    service_interest: str
    project_scope: str | None = None
    details: str | None = None


class ServiceInquiryOut(ServiceInquiryCreate):
    id: int
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True
