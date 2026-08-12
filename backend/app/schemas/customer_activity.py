from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.product import ProductOut


class AddToWishlistRequest(BaseModel):
    product_id: int


class SavedProductOut(BaseModel):
    id: int
    product: ProductOut
    created_at: datetime

    class Config:
        from_attributes = True


class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = Field(default=1, gt=0)


class CartItemQuantityUpdate(BaseModel):
    quantity: int = Field(ge=0)  # 0 removes the item


class CartItemOut(BaseModel):
    id: int
    product: ProductOut
    quantity: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True