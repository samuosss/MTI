from datetime import datetime

from pydantic import BaseModel, Field

from app.models.product import SpecLabel


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    icon: str | None = None
    parent_id: int | None = None

    class Config:
        from_attributes = True


class CategoryTreeOut(CategoryOut):
    children: list["CategoryTreeOut"] = Field(default_factory=list)


class CategoryCreate(BaseModel):
    name: str
    slug: str | None = None  # auto-generated from name if omitted
    icon: str | None = None
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    parent_id: int | None = None


class BrandOut(BaseModel):
    id: int
    name: str
    logo_url: str | None = None
    product_count: int = 0

    class Config:
        from_attributes = True


class BrandCreate(BaseModel):
    name: str
    logo_url: str | None = None


class BrandUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None


class ProductImageOut(BaseModel):
    id: int
    image_url: str
    is_primary: bool
    position: int

    class Config:
        from_attributes = True


class ProductSpecIn(BaseModel):
    label: SpecLabel
    value: str
    notes: str | None = None


class ProductSpecOut(ProductSpecIn):
    id: int

    class Config:
        from_attributes = True


class ProductVariantOptionIn(BaseModel):
    group_label: str
    option_label: str
    image_url: str | None = None
    position: int = 0
    is_default: bool = False


class ProductVariantOptionOut(ProductVariantOptionIn):
    id: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    price: float
    original_price: float | None = None
    badge: str | None = None
    stock: int = 0
    rating: float = 4.0
    category_id: int | None = None
    brand_id: int | None = None


class ProductCreate(ProductBase):
    slug: str | None = None  # auto-generated from name if omitted
    specs: list[ProductSpecIn] = Field(default_factory=list)
    variant_options: list[ProductVariantOptionIn] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    original_price: float | None = None
    badge: str | None = None
    stock: int | None = None
    rating: float | None = None
    category_id: int | None = None
    brand_id: int | None = None
    specs: list[ProductSpecIn] | None = None
    variant_options: list[ProductVariantOptionIn] | None = None


class ProductOut(ProductBase):
    id: int
    slug: str
    category: CategoryOut | None = None
    brand: BrandOut | None = None
    images: list[ProductImageOut] = Field(default_factory=list)
    specs: list[ProductSpecOut] = Field(default_factory=list)
    variant_options: list[ProductVariantOptionOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ProductOut]