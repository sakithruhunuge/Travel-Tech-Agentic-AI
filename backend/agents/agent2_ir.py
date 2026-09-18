"""Agent 2 — Information Retrieval (IR) Tool for Travel-Tech Agentic AI.

Queries MongoDB staging database (`travel_staging`) using:
1. Strategy A: Geospatial hotel search ($geoNear within 100km, filtered by budget_per_night)
2. Strategy B: Vector similarity search on custom_vibe embedding (Atlas $vectorSearch or Python NumPy cosine fallback)
3. Strategy C: Geospatial POI search ($geoNear within 50km, filtered by interests, sorted by popularity_index)

Pure Python & MongoDB queries — NO LLM calls.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

import numpy as np
from bson import ObjectId
from pymongo.errors import PyMongoError, OperationFailure

try:
    from backend.db.mongo_client import main_db
    from backend.agents.embedding_helper import encode
except ImportError:
    from db.mongo_client import main_db
    from agents.embedding_helper import encode


def _convert_object_ids(obj: Any) -> Any:
    """Recursively converts MongoDB ObjectId fields to string."""
    if isinstance(obj, dict):
        return {k: _convert_object_ids(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_object_ids(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    return obj


def retrieve_candidates(params: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieves hotel and POI candidates using geospatial and vector similarity search strategies."""
    dest_coords = params.get("destination_coords", {})
    lat = float(dest_coords.get("lat", 0.0))
    lng = float(dest_coords.get("lng", 0.0))
    budget_max_usd = float(params.get("budget_max_usd", 0.0))
    duration_days = int(params.get("duration_days", 1))
    budget_per_night = budget_max_usd / max(duration_days, 1)

    interests = params.get("interests", []) or []
    custom_vibe = params.get("custom_vibe", "") or ""

    # MongoDB collection handles
    staging_db = main_db.client["travel_staging"]
    staged_hotels = staging_db["staged_hotels"]
    staged_places = staging_db["staged_places"]

    return {
        "hotels": [],
        "pois": [],
        "query_metadata": {
            "destination_coords": params.get("destination_coords"),
            "budget_per_night": budget_per_night,
        },
    }
