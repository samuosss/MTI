from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CustomerSignup(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_verified: bool

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class VerifyEmailRequest(BaseModel):
    token: str


class CustomerAdminOut(BaseModel):
    """Richer view for the admin backoffice — includes fields customers don't see about themselves."""
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    is_banned: bool
    ban_reason: str | None = None
    banned_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[CustomerAdminOut]


class CustomerStatusUpdate(BaseModel):
    is_active: bool


class BanRequest(BaseModel):
    reason: str | None = None