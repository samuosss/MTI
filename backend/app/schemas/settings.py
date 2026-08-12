from typing import Optional, List
from pydantic import BaseModel


class CurrencyItem(BaseModel):
    code: str
    symbol: str
    enabled: bool = True
    rate: float = 1.0


class LanguageItem(BaseModel):
    code: str
    label: str
    enabled: bool = True


class SiteSettingsOut(BaseModel):
    maintenance_enabled: bool
    maintenance_message: Optional[str] = None
    currencies: List[CurrencyItem]
    default_currency: str
    languages: List[LanguageItem]
    default_language: str

    class Config:
        from_attributes = True


class SiteSettingsPatch(BaseModel):
    maintenance_enabled: Optional[bool] = None
    maintenance_message: Optional[str] = None
    currencies: Optional[List[CurrencyItem]] = None
    default_currency: Optional[str] = None
    languages: Optional[List[LanguageItem]] = None
    default_language: Optional[str] = None