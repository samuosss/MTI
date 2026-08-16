# app/crud/delivery_agency.py
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.models.delivery_agency import DeliveryAgency
from app.schemas.delivery_agency import DeliveryAgencyCreate, DeliveryAgencyUpdate


def list_agencies(db: Session, active_only: bool = False) -> list[DeliveryAgency]:
    query = db.query(DeliveryAgency)
    if active_only:
        query = query.filter(DeliveryAgency.active.is_(True))
    return query.order_by(asc(DeliveryAgency.sort_order), asc(DeliveryAgency.id)).all()


def get_agency(db: Session, agency_id: int) -> DeliveryAgency | None:
    return db.query(DeliveryAgency).filter(DeliveryAgency.id == agency_id).first()


def create_agency(db: Session, data: DeliveryAgencyCreate) -> DeliveryAgency:
    agency = DeliveryAgency(**data.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return agency


def update_agency(db: Session, agency: DeliveryAgency, data: DeliveryAgencyUpdate) -> DeliveryAgency:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agency, field, value)
    db.commit()
    db.refresh(agency)
    return agency


def delete_agency(db: Session, agency: DeliveryAgency) -> None:
    db.delete(agency)
    db.commit()