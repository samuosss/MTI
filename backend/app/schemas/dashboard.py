from pydantic import BaseModel


class KpiOut(BaseModel):
    label: str
    value: float
    unit: str | None = None  # "$" | "%" | None


class CategoryShareOut(BaseModel):
    name: str
    value: float  # percentage share


class DashboardOverviewOut(BaseModel):
    total_inventory_value: float
    active_quotes: int
    pending_quotes: int
    monthly_revenue_estimate: float
    category_breakdown: list[CategoryShareOut]
