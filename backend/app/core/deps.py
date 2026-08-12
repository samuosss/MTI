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
    """
    Use on endpoints that should stay off-limits until the customer verifies their
    email (e.g. adding to cart, checkout). Login itself stays open regardless —
    see get_current_customer, which this builds on top of.
    """
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
    """For routes that behave differently when logged in but don't require it."""
    if session_token is None:
        return None
    session = customer_crud.get_session_by_token(db, session_token)
    if session is None:
        return None
    return customer_crud.get_by_id(db, session.customer_id)