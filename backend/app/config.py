import logging
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("mti")


class Settings(BaseSettings):
    # General
    APP_NAME: str = "MTI Backend API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+psycopg://mti_user:mti_password@127.0.0.1:5432/mti_db"

    # Auth / JWT
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_-hex_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://172.24.176.1:5173",  # Windows host → WSL/Docker
    ]

    # Rate limiting — see app/core/limiter.py
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_SIGNUP: str = "3/hour"
    RATE_LIMIT_FORGOT_PASSWORD: str = "3/hour"
    RATE_LIMIT_RESEND_VERIFICATION: str = "3/hour"

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    # SMTP — leave SMTP_HOST empty to keep the current dev behavior
    # (emails logged/printed to console instead of actually sent).
    # Fill these in with your "Mail professionnel" account settings:
    # cPanel → Comptes emails → "Configurer le client mail" → Configuration manuelle.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "MTI"

    # Admin notification recipient — receives an email on every new order, e.g.:
    # ADMIN_NOTIFY_EMAIL=admin@mtishop.tn
    ADMIN_NOTIFY_EMAIL: str = ""

    # Used to build links inside emails (verify-email, reset-password)
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    s = Settings()

    if s.ENVIRONMENT == "production":
        # Fail fast rather than silently run insecure in prod.
        if s.SECRET_KEY.startswith("CHANGE_ME"):
            raise RuntimeError(
                "SECRET_KEY is still the default placeholder. Set a real random value "
                "(e.g. `openssl rand -hex 32`) in your production .env before starting the app."
            )
        if s.DEBUG:
            raise RuntimeError("DEBUG must be False in production — set DEBUG=false in .env.")
        if not s.SMTP_HOST:
            logger.warning(
                "SMTP_HOST is empty in production — verification/reset emails will only be "
                "logged to the console, not actually sent. Set SMTP_* in your production .env."
            )
        if not s.ADMIN_NOTIFY_EMAIL:
            logger.warning(
                "ADMIN_NOTIFY_EMAIL is empty in production — new order notifications will "
                "only go to the customer. Set ADMIN_NOTIFY_EMAIL in your production .env."
            )

    if s.ENVIRONMENT == "production" and any(
        "localhost" in origin or "127.0.0.1" in origin for origin in s.CORS_ORIGINS
    ):
        logger.warning(
            "CORS_ORIGINS still contains local dev origins while ENVIRONMENT=production — "
            "override CORS_ORIGINS in your production .env with only the real domain(s)."
        )

    return s


settings = get_settings()