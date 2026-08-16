import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.product import Product, ProductImage, ProductSpec
from app.schemas.product import ProductCreate, ProductUpdate
from app.models.product import Category, Brand  # add to existing import line
from app.schemas.product import BrandCreate, BrandUpdate, CategoryCreate, CategoryUpdate

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def get_product(db: Session, product_id: int) -> Product | None:
    return db.get(Product, product_id)


def get_product_by_slug(db: Session, slug: str) -> Product | None:
    return db.scalar(select(Product).where(Product.slug == slug))


def list_products(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    category_id: int | None = None,
    brand_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "newest",
) -> tuple[int, list[Product]]:
    query = select(Product)

    if search:
        like = f"%{search}%"
        query = query.where(or_(Product.name.ilike(like), Product.description.ilike(like)))
    if category_id:
        query = query.where(Product.category_id == category_id)
    if brand_id:
        query = query.where(Product.brand_id == brand_id)
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)

    sort_map = {
        "newest": Product.created_at.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name": Product.name.asc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))

    total = len(db.scalars(query).all())
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return total, list(items)


def create_product(db: Session, data: ProductCreate) -> Product:
    slug = data.slug or slugify(data.name)
    base_slug = slug
    counter = 1
    while get_product_by_slug(db, slug) is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1

    product_data = data.model_dump(exclude={"slug", "specs"})
    product = Product(**{**product_data, "slug": slug})

    for spec in data.specs:
        product.specs.append(ProductSpec(label=spec.label, value=spec.value, notes=spec.notes))

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, data: ProductUpdate) -> Product:
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle specs separately — delete existing then re-insert
    new_specs = update_data.pop("specs", None)
    if new_specs is not None:
        # Delete all existing specs for this product
        from app.models.product import ProductSpec
        db.query(ProductSpec).filter(ProductSpec.product_id == product.id).delete()
        db.flush()  # flush deletes before inserting
        # Insert new specs
        for spec_data in new_specs:
            spec = ProductSpec(product_id=product.id, **spec_data if isinstance(spec_data, dict) else spec_data.model_dump())
            db.add(spec)

    # Update remaining scalar fields
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product

def delete_product(db: Session, product: Product) -> None:
    db.delete(product)  # cascades ProductImage and ProductSpec rows; files on disk are left
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ce produit est référencé dans des devis existants et ne peut pas être supprimé.",
        )


# ── Image handling ─────────────────────────────────────────────────────────


def _save_product_image_file(file: UploadFile) -> str:
    """Saves an uploaded image to disk and returns its web-servable URL path."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    upload_dir = Path(settings.UPLOAD_DIR) / "products"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    destination = upload_dir / filename
    with destination.open("wb") as f:
        f.write(file.file.read())

    # Web-servable path, matches the StaticFiles mount in main.py ("/uploads" -> settings.UPLOAD_DIR)
    return f"/uploads/products/{filename}"


def add_product_images(
    db: Session,
    product: Product,
    files: list[UploadFile],
    primary_index: int | None = None,
) -> Product:
    """Saves one or more uploaded files and attaches them to the product.

    If primary_index is given, that file (0-based, within this batch) becomes
    the new primary image and any existing primary is unset. If the product
    has no primary image yet and none is specified, the first uploaded file
    becomes primary by default.
    """
    if not files:
        return product

    has_existing_primary = any(img.is_primary for img in product.images)
    next_position = max((img.position for img in product.images), default=-1) + 1

    new_images: list[ProductImage] = []
    for i, file in enumerate(files):
        url = _save_product_image_file(file)
        new_images.append(
            ProductImage(
                product_id=product.id,
                image_url=url,
                position=next_position + i,
            )
        )

    if primary_index is not None:
        if not (0 <= primary_index < len(new_images)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"primary_index {primary_index} is out of range for {len(new_images)} uploaded file(s)",
            )
        for img in product.images:
            img.is_primary = False
        new_images[primary_index].is_primary = True
    elif not has_existing_primary:
        new_images[0].is_primary = True

    db.add_all(new_images)
    db.commit()
    db.refresh(product)
    return product


def set_primary_image(db: Session, product: Product, image_id: int) -> Product:
    target = next((img for img in product.images if img.id == image_id), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found on this product")

    for img in product.images:
        img.is_primary = img.id == image_id

    db.commit()
    db.refresh(product)
    return product


def delete_product_image(db: Session, product: Product, image_id: int) -> Product:
    target = next((img for img in product.images if img.id == image_id), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found on this product")

    was_primary = target.is_primary
    db.delete(target)
    db.flush()

    if was_primary:
        remaining = sorted(
            [img for img in product.images if img.id != image_id], key=lambda i: i.position
        )
        if remaining:
            remaining[0].is_primary = True

    db.commit()
    db.refresh(product)
    return product
def get_category(db: Session, category_id: int) -> Category | None:
    return db.get(Category, category_id)


def get_category_by_slug(db: Session, slug: str) -> Category | None:
    return db.scalar(select(Category).where(Category.slug == slug))


def list_categories_flat(db: Session) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


def list_categories_tree(db: Session) -> list[Category]:
    """Returns only top-level categories; each has .children populated via the relationship."""
    return list(
        db.scalars(select(Category).where(Category.parent_id.is_(None)).order_by(Category.name)).all()
    )


def create_category(db: Session, data: CategoryCreate) -> Category:
    if data.parent_id is not None and get_category(db, data.parent_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent category not found")

    slug = data.slug or slugify(data.name)
    base_slug = slug
    counter = 1
    while get_category_by_slug(db, slug) is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1

    category = Category(name=data.name, slug=slug, icon=data.icon, parent_id=data.parent_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category: Category, data: CategoryUpdate) -> Category:
    if data.parent_id is not None:
        if data.parent_id == category.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A category cannot be its own parent")
        if get_category(db, data.parent_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent category not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    if category.children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a category that has subcategories. Delete or reassign them first.",
        )
    if category.products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a category that has products assigned. Reassign them first.",
        )
    db.delete(category)
    db.commit()


def get_brand(db: Session, brand_id: int) -> Brand | None:
    return db.get(Brand, brand_id)


def get_brand_by_name(db: Session, name: str) -> Brand | None:
    return db.scalar(select(Brand).where(Brand.name == name))


def list_brands(db: Session) -> list[Brand]:
    return list(db.scalars(select(Brand).order_by(Brand.name)).all())


def create_brand(db: Session, data: "BrandCreate") -> Brand:
    if get_brand_by_name(db, data.name) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une marque avec ce nom existe déjà.",
        )
    brand = Brand(name=data.name, logo_url=data.logo_url)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


def update_brand(db: Session, brand: Brand, data: "BrandUpdate") -> Brand:
    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != brand.name:
        if get_brand_by_name(db, update_data["name"]) is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une marque avec ce nom existe déjà.",
            )
    for field, value in update_data.items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return brand


def delete_brand(db: Session, brand: Brand) -> None:
    if brand.products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer une marque associée à des produits. Réaffectez-les d'abord.",
        )
    db.delete(brand)
    db.commit()

    