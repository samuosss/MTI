from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class AdminCreate(BaseModel):
    """Used by an admin to create a new moderator (or admin) account."""
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: Literal["admin", "moderator"] = "moderator"


class AdminUpdate(BaseModel):
    """Partial update — only fields actually sent are applied."""
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: Literal["admin", "moderator"] | None = None
    is_active: bool | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)