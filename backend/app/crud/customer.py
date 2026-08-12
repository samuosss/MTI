from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.customer import Customer, CustomerSession, EmailVerificationToken, PasswordResetToken


def get_by_email(db: Session, email: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.email == email))


def get_by_id(db: Session, customer_id: int) -> Customer | None:
    return db.get(Customer, customer_id)


def create_customer(db: Session, email: str, full_name: str, password: str) -> Customer:
    customer = Customer(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def authenticate(db: Session, email: str, password: str) -> Customer | None:
    customer = get_by_email(db, email)
    if customer is None or not verify_password(password, customer.hashed_password):
        return None
    return customer


def create_session(db: Session, customer: Customer) -> CustomerSession:
    session = CustomerSession(
        token=CustomerSession.new_token(),
        customer_id=customer.id,
        expires_at=CustomerSession.default_expiry(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_by_token(db: Session, token: str) -> CustomerSession | None:
    session = db.scalar(select(CustomerSession).where(CustomerSession.token == token))
    if session is None or session.expires_at < datetime.utcnow():
        return None
    return session


def delete_session(db: Session, token: str) -> None:
    session = db.scalar(select(CustomerSession).where(CustomerSession.token == token))
    if session is not None:
        db.delete(session)
        db.commit()


def create_reset_token(db: Session, customer: Customer) -> PasswordResetToken:
    reset_token = PasswordResetToken(
        token=PasswordResetToken.new_token(),
        customer_id=customer.id,
        expires_at=PasswordResetToken.default_expiry(),
    )
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    return reset_token


def get_valid_reset_token(db: Session, token: str) -> PasswordResetToken | None:
    reset_token = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token == token))
    if reset_token is None or reset_token.used or reset_token.expires_at < datetime.utcnow():
        return None
    return reset_token


def consume_reset_token(db: Session, reset_token: PasswordResetToken, new_password: str) -> None:
    customer = reset_token.customer
    customer.hashed_password = hash_password(new_password)
    reset_token.used = True
    db.commit()
    # Invalidate all existing sessions on password change — standard security practice
    for session in customer.sessions:
        db.delete(session)
    db.commit()


# ── Email verification ──────────────────────────────────────────────────────

def create_verification_token(db: Session, customer: Customer) -> EmailVerificationToken:
    verification_token = EmailVerificationToken(
        token=EmailVerificationToken.new_token(),
        customer_id=customer.id,
        expires_at=EmailVerificationToken.default_expiry(),
    )
    db.add(verification_token)
    db.commit()
    db.refresh(verification_token)
    return verification_token


def get_valid_verification_token(db: Session, token: str) -> EmailVerificationToken | None:
    verification_token = db.scalar(
        select(EmailVerificationToken).where(EmailVerificationToken.token == token)
    )
    if (
        verification_token is None
        or verification_token.used
        or verification_token.expires_at < datetime.utcnow()
    ):
        return None
    return verification_token


def consume_verification_token(db: Session, verification_token: EmailVerificationToken) -> Customer:
    customer = verification_token.customer
    customer.is_verified = True
    verification_token.used = True
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[int, list[Customer]]:
    query = select(Customer)
    count_query = select(func.count()).select_from(Customer)

    if search:
        like_pattern = f"%{search}%"
        query = query.where(
            (Customer.email.ilike(like_pattern)) | (Customer.full_name.ilike(like_pattern))
        )
        count_query = count_query.where(
            (Customer.email.ilike(like_pattern)) | (Customer.full_name.ilike(like_pattern))
        )

    total = db.scalar(count_query)

    query = (
        query.order_by(Customer.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(query).all()

    return total, items


def set_active_status(db: Session, customer: Customer, is_active: bool) -> Customer:
    customer.is_active = is_active
    db.commit()
    db.refresh(customer)
    if not is_active:
        # Kick them out of any active sessions immediately on deactivation
        for session in customer.sessions:
            db.delete(session)
        db.commit()
    return customer


def ban_customer(
    db: Session,
    customer: Customer,
    admin_id: int,
    reason: str | None = None,
) -> Customer:
    customer.is_banned = True
    customer.ban_reason = reason
    customer.banned_at = datetime.utcnow()
    customer.banned_by_admin_id = admin_id
    db.commit()
    db.refresh(customer)

    # Kill every active session immediately — a banned customer shouldn't
    # keep using an already-open tab.
    for session in customer.sessions:
        db.delete(session)
    db.commit()

    return customer


def unban_customer(db: Session, customer: Customer) -> Customer:
    customer.is_banned = False
    customer.ban_reason = None
    customer.banned_at = None
    customer.banned_by_admin_id = None
    db.commit()
    db.refresh(customer)
    return customer