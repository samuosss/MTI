from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.service import ServiceInquiry
from app.models.user import AdminUser
from app.schemas.service import ServiceInquiryCreate, ServiceInquiryOut

router = APIRouter(prefix="/api/service-inquiries", tags=["Service Inquiries"])


@router.post("", response_model=ServiceInquiryOut, status_code=status.HTTP_201_CREATED)
def submit_service_inquiry(data: ServiceInquiryCreate, db: Session = Depends(get_db)):
    """Matches the 'Start Your Technical Journey' form on the /services page."""
    inquiry = ServiceInquiry(**data.model_dump())
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return inquiry


@router.get("", response_model=list[ServiceInquiryOut])
def list_service_inquiries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    query = (
        select(ServiceInquiry)
        .order_by(ServiceInquiry.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return db.scalars(query).all()


@router.patch("/{inquiry_id}/resolve", response_model=ServiceInquiryOut)
def resolve_service_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    inquiry = db.get(ServiceInquiry, inquiry_id)
    if inquiry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    inquiry.is_resolved = True
    db.commit()
    db.refresh(inquiry)
    return inquiry
