"""Pydantic v2 schemas for cleaned and staged travel data.

Contains:
- HotelDocument: Cleaned hotel records with coordinates, pricing, amenities, and text_blob.
- POIDocument: Cleaned point of interest records with category, coordinates, and text_blob.
"""

from typing import List
from pydantic import BaseModel, Field, field_validator, model_validator


class HotelDocument(BaseModel):
    """Schema for cleaned hotel documents ready for staging & embedding."""

    name: str = Field(..., description="Hotel or property name")
    lat: float = Field(..., description="Latitude coordinate (-90 to 90)")
    lng: float = Field(..., description="Longitude coordinate (-180 to 180)")
    price_usd: float = Field(default=0.0, description="Nightly price in USD")
    star_rating: str = Field(default="Unrated", description="Star rating or review category")
    amenities: List[str] = Field(default_factory=list, description="List of amenities")
    description: str = Field(default="No description available.", description="Property summary description")
    reviews: List[str] = Field(default_factory=list, description="Sample user review snippets")
    source: str = Field(default="booking", description="Source provider (e.g., booking, google)")
    text_blob: str = Field(..., description="Concatenated textual representation for semantic embeddings")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        s = v.strip() if v else ""
        if not s:
            raise ValueError("Hotel name must not be empty.")
        return s

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError(f"Latitude {v} out of bounds [-90, 90].")
        return round(float(v), 7)

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError(f"Longitude {v} out of bounds [-180, 180].")
        return round(float(v), 7)

    @field_validator("price_usd")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v is None or v < 0.0:
            return 0.0
        return round(float(v), 2)

    @field_validator("star_rating")
    @classmethod
    def validate_star_rating(cls, v: str) -> str:
        s = (v or "").strip()
        return s if s else "Unrated"

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        s = (v or "").strip()
        return s if s else "No description available."

    @field_validator("amenities", "reviews")
    @classmethod
    def validate_str_lists(cls, v: List[str]) -> List[str]:
        if not v:
            return []
        return [str(item).strip() for item in v if str(item).strip()]

    @field_validator("text_blob")
    @classmethod
    def validate_text_blob(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("text_blob must not be empty.")
        return s


class POIDocument(BaseModel):
    """Schema for cleaned Point of Interest (POI) documents ready for staging & embedding."""

    name: str = Field(..., description="Point of interest or attraction name")
    lat: float = Field(..., description="Latitude coordinate (-90 to 90)")
    lng: float = Field(..., description="Longitude coordinate (-180 to 180)")
    category: str = Field(..., description="Attraction or amenity category")
    tags: List[str] = Field(default_factory=list, description="Categorization tags")
    description: str = Field(default="No description available.", description="Attraction description")
    reviews: List[str] = Field(default_factory=list, description="Sample user reviews")
    popularity_raw: float = Field(default=0.0, description="Raw popularity score or review count")
    source: str = Field(default="openstreetmap", description="Source provider (e.g. openstreetmap)")
    text_blob: str = Field(..., description="Concatenated textual representation for semantic embeddings")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        s = v.strip() if v else ""
        if not s:
            raise ValueError("POI name must not be empty.")
        return s

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError(f"Latitude {v} out of bounds [-90, 90].")
        return round(float(v), 7)

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError(f"Longitude {v} out of bounds [-180, 180].")
        return round(float(v), 7)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        s = (v or "").strip()
        return s if s else "attraction"

    @field_validator("popularity_raw")
    @classmethod
    def validate_popularity(cls, v: float) -> float:
        if v is None or v < 0.0:
            return 0.0
        return round(float(v), 2)

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        s = (v or "").strip()
        return s if s else "No description available."

    @field_validator("tags", "reviews")
    @classmethod
    def validate_str_lists(cls, v: List[str]) -> List[str]:
        if not v:
            return []
        return [str(item).strip() for item in v if str(item).strip()]

    @field_validator("text_blob")
    @classmethod
    def validate_text_blob(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("text_blob must not be empty.")
        return s
