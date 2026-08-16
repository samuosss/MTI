import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, require_admin_or_moderator_product_access, require_admin_role
from app.crud import product as product_crud
from app.database import get_db
from app.models.product import Brand, Category
from app.models.user import AdminUser
from app.schemas.product import (
    BrandCreate,
    BrandOut,
    BrandUpdate,
    CategoryCreate,
    CategoryOut,
    CategoryTreeOut,
    CategoryUpdate,
    ProductCreate,
    ProductListResponse,
    ProductOut,
    ProductSpecIn,
    ProductUpdate,
)

router = APIRouter(prefix="/api/products", tags=["Products"])

SPECS_EXAMPLE = (
    'JSON list, e.g. '
    '[{"label":"RAM","value":"16GB","notes":null},'
    '{"label":"Processor","value":"Intel i7","notes":"12th Gen"}]'
)


def _parse_specs(specs: str | None) -> list[ProductSpecIn]:
    if not specs:
        return []
    try:
        raw = json.loads(specs)
        return [ProductSpecIn(**s) for s in raw]
    except (json.JSONDecodeError, TypeError, ValueError, ValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid 'specs' payload: {e}")


# ── Public endpoints ──────────────────────────────────────────────────────────


@router.get("", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    brand_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc|name)$"),
    db: Session = Depends(get_db),
):
    """Powers the /marketplace page: search, category/brand filters, sorting, pagination."""
    total, items = product_crud.list_products(
        db, page, page_size, search, category_id, brand_id, min_price, max_price, sort
    )
    return ProductListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    """Flat list of all categories (top-level and sub), useful for admin dropdowns."""
    return product_crud.list_categories_flat(db)


@router.get("/categories/tree", response_model=list[CategoryTreeOut])
def list_categories_tree(db: Session = Depends(get_db)):
    """Nested tree: top-level categories with .children populated, for frontend nav menus."""
    return product_crud.list_categories_tree(db)


@router.get("/brands", response_model=list[BrandOut])
def list_brands(db: Session = Depends(get_db)):
    brands = product_crud.list_brands(db)
    return [
        BrandOut(id=b.id, name=b.name, logo_url=b.logo_url, product_count=len(b.products))
        for b in brands
    ]


@router.get("/{slug}", response_model=ProductOut)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = product_crud.get_product_by_slug(db, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


# ── Admin-only: category management (moderators cannot touch categories) ────


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    return product_crud.create_category(db, data)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    category = product_crud.get_category(db, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return product_crud.update_category(db, category, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    category = product_crud.get_category(db, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    product_crud.delete_category(db, category)

    
@router.post("/brands", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(
    data: BrandCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    brand = product_crud.create_brand(db, data)
    return BrandOut(id=brand.id, name=brand.name, logo_url=brand.logo_url, product_count=0)


@router.patch("/brands/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: int,
    data: BrandUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    brand = product_crud.get_brand(db, brand_id)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    brand = product_crud.update_brand(db, brand, data)
    return BrandOut(id=brand.id, name=brand.name, logo_url=brand.logo_url, product_count=len(brand.products))


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_role),
):
    brand = product_crud.get_brand(db, brand_id)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    product_crud.delete_brand(db, brand)


# ── Admin + Moderator: product management ────────────────────────────────────


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    name: str = Form(...),
    description: str | None = Form(None),
    specs: str | None = Form(None, description=SPECS_EXAMPLE),
    price: float = Form(...),
    original_price: float | None = Form(None),
    badge: str | None = Form(None),
    stock: int = Form(0),
    rating: float = Form(4.0),
    category_id: int | None = Form(None),
    brand_id: int | None = Form(None),
    slug: str | None = Form(None),
    primary_index: int | None = Form(None, description="0-based index among uploaded 'images' marking the cover photo"),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_or_moderator_product_access),
):
    parsed_specs = _parse_specs(specs)

    data = ProductCreate(
        name=name,
        description=description,
        specs=parsed_specs,
        price=price,
        original_price=original_price,
        badge=badge,
        stock=stock,
        rating=rating,
        category_id=category_id,
        brand_id=brand_id,
        slug=slug,
    )

    product = product_crud.create_product(db, data)

    valid_images = [f for f in images if f.filename]
    if valid_images:
        product = product_crud.add_product_images(db, product, valid_images, primary_index)

    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    name: str | None = Form(None),
    description: str | None = Form(None),
    specs: str | None = Form(None, description=SPECS_EXAMPLE),
    price: float | None = Form(None),
    original_price: float | None = Form(None),
    badge: str | None = Form(None),
    stock: int | None = Form(None),
    rating: float | None = Form(None),
    category_id: int | None = Form(None),
    brand_id: int | None = Form(None),
    primary_index: int | None = Form(None, description="0-based index among newly uploaded 'images' marking the cover photo"),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_or_moderator_product_access),
):
    product = product_crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    parsed_specs = _parse_specs(specs) if specs is not None else None

    update_fields = {
        "name": name,
        "description": description,
        "specs": parsed_specs,
        "price": price,
        "original_price": original_price,
        "badge": badge,
        "stock": stock,
        "rating": rating,
        "category_id": category_id,
        "brand_id": brand_id,
    }
    data = ProductUpdate(**{k: v for k, v in update_fields.items() if v is not None})
    product = product_crud.update_product(db, product, data)

    valid_images = [f for f in images if f.filename]
    if valid_images:
        product = product_crud.add_product_images(db, product, valid_images, primary_index)

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_or_moderator_product_access),
):
    product = product_crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_crud.delete_product(db, product)


# ── Admin + Moderator: image management (part of product editing) ──────────


@router.patch("/{product_id}/images/{image_id}/primary", response_model=ProductOut)
def set_primary_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_or_moderator_product_access),
):
    product = product_crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product_crud.set_primary_image(db, product, image_id)


@router.delete("/{product_id}/images/{image_id}", response_model=ProductOut)
def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_or_moderator_product_access),
):
    product = product_crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product_crud.delete_product_image(db, product, image_id)     