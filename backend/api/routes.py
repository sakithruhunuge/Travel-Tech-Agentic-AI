"""FastAPI route controllers for itinerary generation and persistence."""

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

from backend.api.models import (
    ItineraryRequest,
    ItineraryResponse,
    SaveItineraryRequest,
)

try:
    from backend.db.mongo_client import main_db
except ImportError:
    from mongo_client import main_db

router = APIRouter(prefix="/api/v1", tags=["Itineraries"])


@router.post(
    "/generate-itinerary",
    response_model=ItineraryResponse,
    summary="Generate personalized travel itinerary",
)
async def generate_itinerary(request: ItineraryRequest) -> ItineraryResponse:
    """Generates a complete multi-day itinerary using the 4-agent pipeline."""
    try:
        # TODO: Replace with orchestrator.run_agent_pipeline() in Phase 7
        return ItineraryResponse(
            itinerary="# Itinerary placeholder\n\nAgents not yet connected.",
            hotels=[],
            pois=[],
            estimated_total_usd=0.0,
            budget_warning=False,
            reasoning={},
            agent_timings={},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate itinerary: {str(e)}",
        )


@router.post(
    "/save-itinerary",
    status_code=status.HTTP_201_CREATED,
    summary="Save generated itinerary to user profile",
)
async def save_itinerary(request: SaveItineraryRequest) -> Dict[str, Any]:
    """Persists an itinerary document into the main_db 'saved_itineraries' collection."""
    try:
        saved_col = main_db["saved_itineraries"]
        doc = request.model_dump()
        doc["created_at"] = datetime.now(timezone.utc)

        result = saved_col.insert_one(doc)
        return {"status": "saved", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save itinerary: {str(e)}",
        )


@router.get(
    "/itineraries/{user_id}",
    response_model=List[Dict[str, Any]],
    summary="Retrieve user saved itineraries",
)
async def get_user_itineraries(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves up to 20 saved itineraries for a user, sorted newest first."""
    try:
        saved_col = main_db["saved_itineraries"]
        cursor = (
            saved_col.find({"user_id": user_id})
            .sort("created_at", -1)
            .limit(20)
        )

        results = []
        for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            if isinstance(doc.get("created_at"), datetime):
                doc["created_at"] = doc["created_at"].isoformat()
            results.append(doc)

        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch itineraries for user '{user_id}': {str(e)}",
        )
