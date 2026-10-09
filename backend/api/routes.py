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

try:
    from backend.api.models import (
        ItineraryRequest,
        ItineraryResponse,
        SaveItineraryRequest,
        Agent1ProcessRequest,
        Agent1ProcessResponse,
    )
    from backend.db.mongo_client import main_db
    from backend.agents.agent1_triage import parse_user_query
    from backend.agents.orchestrator import run_agent_pipeline
except (ImportError, ModuleNotFoundError):
    from api.models import (
        ItineraryRequest,
        ItineraryResponse,
        SaveItineraryRequest,
        Agent1ProcessRequest,
        Agent1ProcessResponse,
    )
    from db.mongo_client import main_db
    from agents.agent1_triage import parse_user_query
    from agents.orchestrator import run_agent_pipeline

router = APIRouter(prefix="/api/v1", tags=["Itineraries"])
agent_router = APIRouter(tags=["Agents"])


@agent_router.post(
    "/agent1/process",
    response_model=Agent1ProcessResponse,
    summary="Agent 1: Travel Intake & NLP Parser",
)
@router.post(
    "/agent1/process",
    response_model=Agent1ProcessResponse,
    summary="Agent 1: Travel Intake & NLP Parser (API v1)",
)
async def process_agent1(request: Agent1ProcessRequest) -> Agent1ProcessResponse:
    """Parses natural language user query into structured travel parameters."""
    prompt_text = (request.message or request.prompt or request.raw_prompt or "").strip()
    if not prompt_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing prompt or message in request body",
        )

    result = parse_user_query(prompt_text)

    if "error" in result:
        err = result["error"]
        if err == "invalid_query":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security rejection: invalid or adversarial travel query detected.",
            )
        elif err == "off_topic":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Off-topic query: prompt must be related to Sri Lanka travel.",
            )
        elif err == "parse_failed":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to extract structured parameters from travel query.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Agent 1 processing error: {err}",
            )

    return Agent1ProcessResponse(**result)


@agent_router.post(
    "/generate-itinerary",
    response_model=ItineraryResponse,
    summary="Generate personalized travel itinerary",
)
@router.post(
    "/generate-itinerary",
    response_model=ItineraryResponse,
    summary="Generate personalized travel itinerary (API v1)",
)
async def generate_itinerary(request: ItineraryRequest) -> ItineraryResponse:
    """Generates a complete multi-day itinerary using the 4-agent pipeline."""
    # Prioritize user prompt in custom_vibe so Agent 1 can parse user intent accurately
    if request.custom_vibe and len(request.custom_vibe.strip()) > 8:
        prompt = request.custom_vibe.strip()
        # Append hints only if not already mentioned in prompt
        hints = []
        if request.duration_days and "day" not in prompt.lower():
            hints.append(f"{request.duration_days} days")
        if request.budget_usd and "budget" not in prompt.lower() and "$" not in prompt:
            hints.append(f"budget ${request.budget_usd}")
        if request.hotel_tier and request.hotel_tier != "standard" and request.hotel_tier not in prompt.lower():
            hints.append(f"{request.hotel_tier} hotel")
        if request.preferred_star_rating and "star" not in prompt.lower():
            hints.append(f"{int(request.preferred_star_rating)}-star hotel")
        if hints:
            prompt = f"{prompt} ({', '.join(hints)})"
    elif request.custom_vibe:
        prompt = f"{request.duration_days} days in {request.destination}, budget ${request.budget_usd}, {request.custom_vibe}"
    else:
        hotel_hint = f", {request.hotel_tier} hotel" if request.hotel_tier and request.hotel_tier != "standard" else ""
        prompt = f"{request.duration_days} days in {request.destination}, budget ${request.budget_usd}{hotel_hint}"

    result = run_agent_pipeline(prompt)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    return ItineraryResponse(**result)


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
