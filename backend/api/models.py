"""Pydantic request and response models for the Travel Agentic AI API."""

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class ItineraryRequest(BaseModel):
    """Travel itinerary generation request payload."""

    destination: str = Field(..., description="Target destination or region in Sri Lanka, e.g. Galle")
    travel_dates: str = Field(..., description="Travel date range string, e.g. December 10-15, 2026")
    duration_days: int = Field(default=5, ge=1, le=30, description="Duration in days (1 to 30)")
    budget_usd: float = Field(..., ge=50.0, description="Total budget in USD (minimum $50.0)")
    party_size: int = Field(default=2, ge=1, description="Number of travelers")
    interests: List[str] = Field(default_factory=list, description="Traveler interests or themes")
    custom_vibe: str = Field(default="", description="Optional vibe preference (e.g. relaxed, adventurous)")


class ItineraryResponse(BaseModel):
    """Travel itinerary generation response payload."""

    itinerary: str = Field(..., description="Markdown-formatted synthesized itinerary")
    hotels: List[Dict[str, Any]] = Field(default_factory=list, description="Top recommended hotels")
    pois: List[Dict[str, Any]] = Field(default_factory=list, description="Top recommended POIs")
    estimated_total_usd: float = Field(default=0.0, description="Estimated total cost in USD")
    budget_warning: bool = Field(default=False, description="Flag indicating if cost exceeds budget")
    reasoning: Dict[str, Any] = Field(default_factory=dict, description="Scoring & explainability breakdown from Agent 3")
    agent_timings: Dict[str, Any] = Field(default_factory=dict, description="Execution timings for each agent in seconds")


class SaveItineraryRequest(BaseModel):
    """Payload to save an itinerary to user profile."""

    user_id: str = Field(..., description="User identifier")
    itinerary: str = Field(..., description="Markdown or text content of the itinerary")
    destination: str = Field(..., description="Main destination")
    duration_days: int = Field(..., ge=1, description="Trip duration in days")
    estimated_total_usd: float = Field(..., ge=0.0, description="Estimated total cost in USD")
    hotels: List[Dict[str, Any]] = Field(default_factory=list, description="Saved hotel items")
    pois: List[Dict[str, Any]] = Field(default_factory=list, description="Saved POI items")


class Agent1ProcessRequest(BaseModel):
    """Agent 1 NLP Triage parsing request payload."""

    message: str = Field(default="", description="Natural language travel query")
    prompt: str = Field(default="", description="Alternative prompt field")
    raw_prompt: str = Field(default="", description="Alternative raw_prompt field")


class Agent1ProcessResponse(BaseModel):
    """Agent 1 response complying with frontend contract and downstream agents."""

    destination: str = Field(default="", description="Target destination")
    duration: int = Field(default=1, description="Duration in days")
    travellers: int = Field(default=2, description="Number of travelers")
    budget: float = Field(default=500.0, description="Total budget in USD")
    interests: List[str] = Field(default_factory=list, description="Normalized traveler interests")

    # Additional fields to support backend agent coordination
    destination_coords: Dict[str, float] = Field(default_factory=dict)
    duration_days: int = Field(default=1)
    party_size: int = Field(default=2)
    budget_max_usd: float = Field(default=500.0)
    custom_vibe: str = Field(default="")
    travel_dates: str = Field(default="")

