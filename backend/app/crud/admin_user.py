from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import AdminUser
from app.schemas.user import AdminCreate, AdminUpdate


def list_admin_users(db: Session) -> list[AdminUser]:
    return list(db.scalars(select(AdminUser).order_by(AdminUser.created_at.desc())).all())


def get_admin_user(db: Session, user_id: int) -> AdminUser | None:
    return db.get(AdminUser, user_id)


def get_by_email(db: Session, email: str) -> AdminUser | None:
    return db.scalar(select(AdminUser).where(AdminUser.email == email))


def create_admin_user(db: Session, data: AdminCreate) -> AdminUser:
    user = AdminUser(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_admin_user(db: Session, user: AdminUser, data: AdminUpdate) -> AdminUser:
    update_data = data.model_dump(exclude_unset=True)

    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            user.hashed_password = hash_password(password)

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def delete_admin_user(db: Session, user: AdminUser) -> None:
    db.delete(user)
    db.commit()