from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.crud import customer as customer_crud
from app.database import get_db
from app.models.customer import Customer
from app.models.user import AdminUser

SESSION_COOKIE_NAME = "session_token"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    """Any authenticated back-office user — admin OR moderator.
    Use this for read-only / list / detail endpoints that both roles may access."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.get(AdminUser, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_admin_role(
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminUser:
    """Admin-only gate. Use on any write endpoint a moderator must NOT access
    (quotes edit/delete, moderator account management, settings, etc.)."""
    if current_admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette action nécessite les droits administrateur.",
        )
    return current_admin


def require_admin_or_moderator_product_access(
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminUser:
    """Products write access: both admin and moderator are allowed here,
    since moderators are explicitly permitted to manage products."""
    if current_admin.role not in ("admin", "moderator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé.",
        )
    return current_admin


def get_current_customer(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> Customer:
    if session_token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    session = customer_crud.get_session_by_token(db, session_token)
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired or invalid")

    customer = customer_crud.get_by_id(db, session.customer_id)
    if customer is None or not customer.is_active or customer.is_banned:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account disabled")

    return customer


def require_verified_customer(
    current_customer: Customer = Depends(get_current_customer),
) -> Customer:
    if not current_customer.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Please verify your email address before completing this action",
        )
    return current_customer


def get_optional_customer(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> Customer | None:
    if session_token is None:
        return None
    session = customer_crud.get_session_by_token(db, session_token)
    if session is None:
        return None
    return customer_crud.get_by_id(db, session.customer_id)