# app/routers/delivery_agency.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import delivery_agency as delivery_crud
from app.database import get_db
from app.models.user import AdminUser
from app.schemas.delivery_agency import DeliveryAgencyCreate, DeliveryAgencyOut, DeliveryAgencyUpdate

# Public — used by the storefront cart (CartPage.tsx) to show live delivery
# options at checkout. No auth required, only active agencies are returned.
delivery_router = APIRouter(prefix="/api/delivery-agencies", tags=["Delivery Agencies"])

# Admin/staff-only management — backs the "Livraison" section in the dashboard sidebar.
# Uses get_current_admin (admin OR moderator), matching the "Livraison" nav item's
# adminOnly: false — same access tier as Products.
admin_delivery_router = APIRouter(prefix="/api/admin/delivery-agencies", tags=["Admin Delivery Agencies"])


@delivery_router.get("", response_model=list[DeliveryAgencyOut])
def list_active_agencies(db: Session = Depends(get_db)):
    return delivery_crud.list_agencies(db, active_only=True)


@admin_delivery_router.get("", response_model=list[DeliveryAgencyOut])
def list_all_agencies(
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    return delivery_crud.list_agencies(db, active_only=False)


@admin_delivery_router.post("", response_model=DeliveryAgencyOut, status_code=status.HTTP_201_CREATED)
def create_agency(
    data: DeliveryAgencyCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    return delivery_crud.create_agency(db, data)


@admin_delivery_router.patch("/{agency_id}", response_model=DeliveryAgencyOut)
def update_agency(
    agency_id: int,
    data: DeliveryAgencyUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    agency = delivery_crud.get_agency(db, agency_id)
    if agency is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Delivery agency not found")
    return delivery_crud.update_agency(db, agency, data)


@admin_delivery_router.delete("/{agency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agency(
    agency_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    agency = delivery_crud.get_agency(db, agency_id)
    if agency is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Delivery agency not found")
    delivery_crud.delete_agency(db, agency)
    return