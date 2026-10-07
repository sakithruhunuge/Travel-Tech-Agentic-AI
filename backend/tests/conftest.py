"""Pytest global configuration and fixtures for Travel-Tech Agentic AI.

Provides reusable test fixtures for:
- Environment variable initialization
- Mock MongoDB collections & databases
- Sample candidate hotels and POIs
- Sample user parameters
- Mock embedding models & vector generators
- FastAPI TestClient
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List
import pytest

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

# Ensure dummy connection strings exist for tests if missing in environment
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/travel-tech-test")
os.environ.setdefault("webscrape_URI", "mongodb://localhost:27017/webscrape-test")
os.environ.setdefault("WEBSCRAPE_URI", "mongodb://localhost:27017/webscrape-test")
os.environ.setdefault("LOG_LEVEL", "WARNING")


@pytest.fixture
def sample_user_params() -> Dict[str, Any]:
    """Provides a realistic single-destination user parameter dict from Agent 1."""
    return {
        "destination": "Galle",
        "destinations": ["Galle"],
        "destination_coords": {"lat": 6.0535, "lng": 80.2209},
        "travel_dates": "December 10-15, 2026",
        "duration_days": 5,
        "duration": 5,
        "budget_max_usd": 500.0,
        "budget": 500.0,
        "party_size": 2,
        "travellers": 2,
        "interests": ["Beach", "Historical"],
        "custom_vibe": "quiet boutique hotel near the fort, love beach sunsets",
    }


@pytest.fixture
def sample_multi_dest_params() -> Dict[str, Any]:
    """Provides a realistic multi-destination user parameter dict from Agent 1."""
    return {
        "destination": "Kandy",
        "destinations": ["Kandy", "Galle", "Colombo"],
        "destination_coords": {"lat": 7.2906, "lng": 80.6337},
        "travel_dates": "January 5-15, 2027",
        "duration_days": 6,
        "duration": 6,
        "budget_max_usd": 900.0,
        "budget": 900.0,
        "party_size": 2,
        "travellers": 2,
        "interests": ["Historical", "Nature", "Beach"],
        "custom_vibe": "cultural heritage first, then coastal relaxation",
    }


@pytest.fixture
def sample_hotel_candidates() -> List[Dict[str, Any]]:
    """Provides a diverse pool of mock hotel candidates for testing."""
    return [
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d01",
            "name": "Fort Heritage Villa",
            "city": "Galle",
            "lat": 6.0305,
            "lng": 80.2155,
            "price_usd": 70.0,
            "star_rating": "4 stars",
            "has_wifi": 1,
            "has_pool": 1,
            "has_restaurant": 1,
            "poi_density_5km": 8,
            "nearest_airport": {"distance_km": 110.0, "name": "BIA"},
            "dist_meters": 1200,
        },
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d02",
            "name": "Lighthouse Ocean Grand",
            "city": "Galle",
            "lat": 6.0421,
            "lng": 80.2012,
            "price_usd": 140.0,
            "star_rating": "5 stars",
            "has_wifi": 1,
            "has_pool": 1,
            "has_restaurant": 1,
            "poi_density_5km": 6,
            "nearest_airport": {"distance_km": 115.0, "name": "BIA"},
            "dist_meters": 3500,
        },
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d03",
            "name": "Unawatuna Backpacker Hostel",
            "city": "Unawatuna",
            "lat": 6.0125,
            "lng": 80.2450,
            "price_usd": 25.0,
            "star_rating": "2 stars",
            "has_wifi": 1,
            "has_pool": 0,
            "has_restaurant": 0,
            "poi_density_5km": 4,
            "nearest_airport": {"distance_km": 125.0, "name": "BIA"},
            "dist_meters": 5400,
        },
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d04",
            "name": "Cozy Dutch Inn",
            "city": "Galle",
            "lat": 6.0315,
            "lng": 80.2160,
            "price_usd": 45.0,
            "star_rating": "Unrated",
            "has_wifi": 1,
            "has_pool": 0,
            "has_restaurant": 1,
            "poi_density_5km": 7,
            "nearest_airport": {"distance_km": 112.0, "name": "BIA"},
            "dist_meters": 1100,
        },
    ]


@pytest.fixture
def sample_poi_candidates() -> List[Dict[str, Any]]:
    """Provides a diverse pool of mock POI candidates for testing."""
    return [
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d11",
            "name": "Galle Dutch Fort",
            "city": "Galle",
            "lat": 6.0269,
            "lng": 80.2170,
            "intent_tags": ["Historical", "Urban", "Photography"],
            "popularity_index": 0.98,
        },
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d12",
            "name": "Jungle Beach",
            "city": "Unawatuna",
            "lat": 6.0150,
            "lng": 80.2380,
            "intent_tags": ["Beach", "Nature"],
            "popularity_index": 0.85,
        },
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d13",
            "name": "National Maritime Museum",
            "city": "Galle",
            "lat": 6.0290,
            "lng": 80.2185,
            "intent_tags": ["Historical"],
            "popularity_index": 0.72,
        },
        {
            "_id": "651a1b2c3d4e5f6a7b8c9d14",
            "name": "Rumassala Sanctuary",
            "city": "Unawatuna",
            "lat": 6.0180,
            "lng": 80.2410,
            "intent_tags": ["Nature", "Adventure"],
            "popularity_index": 0.65,
        },
    ]


@pytest.fixture
def sample_curated_data(sample_hotel_candidates, sample_poi_candidates) -> Dict[str, Any]:
    """Provides curated data ready for Agent 4 itinerary generator."""
    hotels = []
    for h in sample_hotel_candidates[:2]:
        h_copy = dict(h)
        h_copy["curator_score"] = 85.0
        hotels.append(h_copy)

    pois = []
    for p in sample_poi_candidates[:3]:
        p_copy = dict(p)
        p_copy["curator_score"] = 90.0
        pois.append(p_copy)

    return {
        "hotels": hotels,
        "pois": pois,
        "budget_warning": False,
        "estimated_total_usd": 380.0,
        "scoring_breakdown": {
            "Fort Heritage Villa": {
                "budget_fit": 25.0,
                "amenity": 20.0,
                "rating": 12.0,
                "density": 16.0,
                "proximity": 12.0,
                "total": 85.0,
            }
        },
    }


@pytest.fixture
def mock_embedding_vector() -> List[float]:
    """Generates a dummy 384-dimensional unit vector."""
    vec = [0.05] * 384
    return vec


@pytest.fixture
def api_client():
    """Provides a FastAPI TestClient configured for route testing."""
    from fastapi.testclient import TestClient
    from backend.main import app
    with TestClient(app) as client:
        yield client
