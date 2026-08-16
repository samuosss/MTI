from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import customer as customer_crud
from app.database import get_db
from app.models.user import AdminUser
from app.schemas.customer import (
    BanRequest,
    CustomerAdminOut,
    CustomerListResponse,
    CustomerStatusUpdate,
)

router = APIRouter(prefix="/api/customers/admin", tags=["Admin: Customers"])


@router.get("", response_model=CustomerListResponse)
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Matches against email or full name"),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    """Powers the customer list view in the admin backoffice."""
    total, items = customer_crud.list_customers(db, page, page_size, search)
    return CustomerListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{customer_id}", response_model=CustomerAdminOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    customer = customer_crud.get_by_id(db, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    return customer


@router.patch("/{customer_id}/status", response_model=CustomerAdminOut)
def update_customer_status(
    customer_id: int,
    data: CustomerStatusUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    """Toggle a customer's account active/disabled — e.g. for banning abusive accounts."""
    customer = customer_crud.get_by_id(db, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    return customer_crud.set_active_status(db, customer, data.is_active)


@router.post("/{customer_id}/ban", response_model=CustomerAdminOut)
def ban_customer(
    customer_id: int,
    data: BanRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Bans a customer and immediately invalidates all their active sessions."""
    customer = customer_crud.get_by_id(db, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    if customer.is_banned:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Customer is already banned")
    return customer_crud.ban_customer(db, customer, current_admin.id, data.reason)


@router.post("/{customer_id}/unban", response_model=CustomerAdminOut)
def unban_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    customer = customer_crud.get_by_id(db, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    if not customer.is_banned:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Customer is not banned")
    return customer_crud.unban_customer(db, customer)

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    """Permanently deletes a customer account and all related sessions/tokens (cascade)."""
    customer = customer_crud.get_by_id(db, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    customer_crud.delete_customer(db, customer)