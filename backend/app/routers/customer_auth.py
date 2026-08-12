from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import SESSION_COOKIE_NAME, get_current_customer
from app.core.limiter import limiter
from app.crud import customer as customer_crud
from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer import (
    CustomerLogin,
    CustomerOut,
    CustomerSignup,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services.email import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/api/customers/auth", tags=["Customer Auth"])

COOKIE_KWARGS = dict(
    httponly=True,
    secure=settings.ENVIRONMENT == "production",  # False in dev so http://localhost works
    samesite="lax",
    path="/",
)


def _set_session_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    response.set_cookie(SESSION_COOKIE_NAME, token, max_age=max_age_seconds, **COOKIE_KWARGS)


def _issue_and_send_verification(customer: Customer, db: Session) -> None:
    verification_token = customer_crud.create_verification_token(db, customer)
    verify_link = f"{settings.FRONTEND_BASE_URL}/verify-email?token={verification_token.token}"
    send_verification_email(customer.email, verify_link)


@router.post("/signup", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_SIGNUP)
def signup(request: Request, data: CustomerSignup, response: Response, db: Session = Depends(get_db)):
    if customer_crud.get_by_email(db, data.email) is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists")

    try:
        customer = customer_crud.create_customer(db, data.email, data.full_name, data.password)
    except IntegrityError:
        # Two signups with the same email raced past the check above at the same time.
        # The DB unique constraint caught it — surface the same clean 400 instead of a 500.
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists")

    _issue_and_send_verification(customer, db)

    session = customer_crud.create_session(db, customer)
    _set_session_cookie(response, session.token, max_age_seconds=14 * 24 * 3600)
    return customer


@router.post("/login", response_model=CustomerOut)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, data: CustomerLogin, response: Response, db: Session = Depends(get_db)):
    customer = customer_crud.authenticate(db, data.email, data.password)
    if customer is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if customer.is_banned:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been suspended")
    if not customer.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    session = customer_crud.create_session(db, customer)
    _set_session_cookie(response, session.token, max_age_seconds=14 * 24 * 3600)
    return customer


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
):
    if session_token:
        customer_crud.delete_session(db, session_token)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return


@router.get("/me", response_model=CustomerOut)
def read_current_customer(current_customer: Customer = Depends(get_current_customer)):
    return current_customer


@router.post("/verify-email", response_model=CustomerOut)
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    verification_token = customer_crud.get_valid_verification_token(db, data.token)
    if verification_token is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired verification link")
    return customer_crud.consume_verification_token(db, verification_token)


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(settings.RATE_LIMIT_RESEND_VERIFICATION)
def resend_verification(
    request: Request,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    if current_customer.is_verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already verified")
    _issue_and_send_verification(current_customer, db)
    return


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    customer = customer_crud.get_by_email(db, data.email)
    if customer is not None:
        reset_token = customer_crud.create_reset_token(db, customer)
        reset_link = f"{settings.FRONTEND_BASE_URL}/reset-password?token={reset_token.token}"
        send_password_reset_email(customer.email, reset_link)
    # Always 204 regardless of whether the email exists — don't leak account existence
    return


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = customer_crud.get_valid_reset_token(db, data.token)
    if reset_token is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token")
    customer_crud.consume_reset_token(db, reset_token, data.new_password)
    return