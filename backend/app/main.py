import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.core.limiter import limiter
from app.database import Base, engine
from app.routers import auth, dashboard, products, quotes, service
from app.routers import hero_slides
from app.routers import customer_auth
from app.routers import customers_admin
from app.routers import customer_activity
from app.routers import settings as settings_router   # <-- aliased, no more collision

logger = logging.getLogger("mti")

is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for the MTI enterprise IT hardware marketplace.",
    version="1.0.0",
    # Don't publish the interactive schema/docs on the public prod URL
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

# ── Rate limiting ──────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(quotes.router)
app.include_router(service.router)
app.include_router(dashboard.router)
app.include_router(hero_slides.router)
app.include_router(customer_auth.router)
app.include_router(customers_admin.router)
app.include_router(customer_activity.wishlist_router)
app.include_router(customer_activity.cart_router)
app.include_router(settings_router.router)   # <-- use the alias here

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}