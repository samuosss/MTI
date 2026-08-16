from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin_role
from app.crud import admin_user as admin_user_crud
from app.database import get_db
from app.models.user import AdminUser
from app.schemas.user import AdminCreate, AdminOut, AdminUpdate

router = APIRouter(prefix="/api/admin-users", tags=["Admin Users"])


@router.get("", response_model=list[AdminOut])
def list_admin_users(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    return admin_user_crud.list_admin_users(db)


@router.post("", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    data: AdminCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    if admin_user_crud.get_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email.",
        )
    return admin_user_crud.create_admin_user(db, data)


@router.patch("/{user_id}", response_model=AdminOut)
def update_admin_user(
    user_id: int,
    data: AdminUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(require_admin_role),
):
    user = admin_user_crud.get_admin_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte introuvable.")

    if user.id == current_admin.id and data.role is not None and data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas retirer vos propres droits administrateur.",
        )
    if user.id == current_admin.id and data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas désactiver votre propre compte.",
        )

    return admin_user_crud.update_admin_user(db, user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(require_admin_role),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas supprimer votre propre compte.",
        )

    user = admin_user_crud.get_admin_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte introuvable.")

    admin_user_crud.delete_admin_user(db, user)