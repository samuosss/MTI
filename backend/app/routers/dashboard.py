from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.product import Category, Product
from app.models.quote import QuoteRequest, QuoteStatus
from app.models.user import AdminUser
from app.schemas.dashboard import CategoryShareOut, DashboardOverviewOut
from app.schemas.quote import QuoteRequestOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewOut)
def dashboard_overview(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    """Powers the KPI cards + 'Top Categories' chart on the dashboard overview tab."""
    total_inventory_value = db.scalar(
        select(func.coalesce(func.sum(Product.price * Product.stock), 0.0))
    )

    active_quotes = db.scalar(
        select(func.count()).select_from(QuoteRequest).where(QuoteRequest.status == QuoteStatus.ACTIVE)
    )
    pending_quotes = db.scalar(
        select(func.count()).select_from(QuoteRequest).where(QuoteRequest.status == QuoteStatus.PENDING)
    )

    monthly_revenue_estimate = db.scalar(
        select(func.coalesce(func.sum(QuoteRequest.estimated_value), 0.0)).where(
            QuoteRequest.status == QuoteStatus.COMPLETED
        )
    )

    # Category breakdown by product count share
    category_counts = db.execute(
        select(Category.name, func.count(Product.id))
        .join(Product, Product.category_id == Category.id)
        .group_by(Category.name)
    ).all()
    total_products = sum(count for _, count in category_counts) or 1
    category_breakdown = [
        CategoryShareOut(name=name, value=round(count / total_products * 100, 1))
        for name, count in category_counts
    ]

    return DashboardOverviewOut(
        total_inventory_value=total_inventory_value,
        active_quotes=active_quotes,
        pending_quotes=pending_quotes,
        monthly_revenue_estimate=monthly_revenue_estimate,
        category_breakdown=category_breakdown,
    )


@router.get("/recent-quotes", response_model=list[QuoteRequestOut])
def recent_quotes(
    limit: int = 5,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    """Powers the 'Recent Quote Requests' table on the dashboard overview tab."""
    query = select(QuoteRequest).order_by(QuoteRequest.created_at.desc()).limit(limit)
    return db.scalars(query).all()
