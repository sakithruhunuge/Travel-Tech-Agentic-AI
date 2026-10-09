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
    """Retrieves hotel and POI candidates using geospatial and vector similarity search strategies.

    Args:
        params (dict): Dict containing:
          - destination_coords: {"lat": float, "lng": float}
          - budget_max_usd: float
          - duration_days: int
          - interests: list[str]
          - custom_vibe: str
          - party_size: int

    Returns:
        dict: {
            "hotels": list[dict],
            "pois": list[dict],
            "query_metadata": dict
        }
    """
    dest_coords = params.get("destination_coords", {})
    lat = float(dest_coords.get("lat", 0.0))
    lng = float(dest_coords.get("lng", 0.0))
    budget_max_usd = float(params.get("budget_max_usd", 0.0))
    duration_days = int(params.get("duration_days", 1))
    budget_per_night = budget_max_usd / max(duration_days, 1)

    interests = params.get("interests", []) or []
    # Normalize interests to match canonical intent_tags stored in MongoDB
    CANONICAL_TAGS = {"Historical", "Nature", "Beach", "Adventure", "Urban", "Food", "Photography"}
    normalized_interests = []
    for tag in interests:
        t_str = str(tag).strip().title()
        if t_str in CANONICAL_TAGS:
            normalized_interests.append(t_str)
        elif t_str.lower().startswith("beach"):
            normalized_interests.append("Beach")
        elif "hist" in t_str.lower():
            normalized_interests.append("Historical")
        elif "photo" in t_str.lower():
            normalized_interests.append("Photography")
        elif "nature" in t_str.lower():
            normalized_interests.append("Nature")
        elif "advent" in t_str.lower():
            normalized_interests.append("Adventure")
        elif "food" in t_str.lower():
            normalized_interests.append("Food")
        elif "urb" in t_str.lower():
            normalized_interests.append("Urban")
    interests = list(dict.fromkeys(normalized_interests or interests))
    custom_vibe = params.get("custom_vibe", "") or ""
    hotel_tier = str(params.get("hotel_tier", "")).lower()
    raw_preferred_stars = params.get("preferred_star_rating")
    try:
        preferred_stars = float(raw_preferred_stars) if raw_preferred_stars is not None else None
    except (ValueError, TypeError):
        preferred_stars = None

    import re
    vibe_lower = custom_vibe.lower()
    is_budget_request = (
        hotel_tier == "budget"
        or (preferred_stars is not None and preferred_stars <= 3.0)
        or bool(re.search(r"\b(?:3[- ]?star|three[- ]?star|budget[- ]?friendly|budget\s+hotel|cheap\s+hotel|economy|affordable|hostel)\b", vibe_lower))
    )
    is_luxury_request = (
        hotel_tier == "luxury"
        or (preferred_stars is not None and preferred_stars >= 5.0)
        or bool(re.search(r"\b(?:5[- ]?star|five[- ]?star|luxury|boutique|villa|resort)\b", vibe_lower))
    )

    # Determine effective hotel budget ceiling to prevent luxury hotels from dominating budget queries
    if is_budget_request:
        effective_hotel_ceiling = min(budget_per_night, 55.0) if budget_per_night > 55.0 else max(budget_per_night, 25.0)
    elif is_luxury_request:
        effective_hotel_ceiling = max(budget_per_night, 120.0)
    else:
        effective_hotel_ceiling = budget_per_night

    # MongoDB collection handles
    staging_db = main_db.client["travel_staging"]
    staged_hotels = staging_db["staged_hotels"]
    staged_places = staging_db["staged_places"]

    # -------------------------------------------------------------------------
    # Strategy A — Geospatial Hotel Search ($geoNear)
    # -------------------------------------------------------------------------
    hotel_geo_query: Dict[str, Any] = {
        "embedding_ready": True,
        "price_usd": {"$lte": effective_hotel_ceiling},
    }
    if is_budget_request:
        hotel_geo_query["$or"] = [
            {"price_tier": "Budget"},
            {"price_usd": {"$gt": 0, "$lte": effective_hotel_ceiling}},
            {"star_rating": {"$regex": "3", "$options": "i"}},
        ]

    pipeline_a = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [lng, lat]},
                "distanceField": "dist_meters",
                "maxDistance": 100000,  # 100km radius
                "query": hotel_geo_query,
                "spherical": True,
            }
        },
        {"$limit": 15},
        {"$project": {"embedding": 0}},
    ]
    try:
        hotels_geo = list(staged_hotels.aggregate(pipeline_a))
    except Exception as e:
        print(f"⚠️ Strategy A ($geoNear hotels) warning: {e}")
        hotels_geo = []

    # -------------------------------------------------------------------------
    # Strategy B — Vector Similarity Search (Atlas $vectorSearch or Python Cosine Fallback)
    # -------------------------------------------------------------------------
    search_prompt = custom_vibe
    if is_budget_request:
        search_prompt = f"{custom_vibe} affordable budget friendly 3-star hotel accommodation"
    elif is_luxury_request:
        search_prompt = f"{custom_vibe} luxury boutique 5-star hotel resort"

    query_vec = encode(search_prompt) if search_prompt else encode("hotel")
    hotels_vec: List[Dict[str, Any]] = []
    vector_search_method = "atlas"

    atlas_pipeline = [
        {
            "$vectorSearch": {
                "index": "hotel_vector_index",
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": 50,
                "limit": 10,
                "filter": {
                    "$and": [
                        {"embedding_ready": {"$eq": True}},
                        {"price_usd": {"$lte": effective_hotel_ceiling}},
                    ]
                },
            }
        },
        {"$project": {"embedding": 0}},
    ]

    try:
        hotels_vec = list(staged_hotels.aggregate(atlas_pipeline))
    except (OperationFailure, PyMongoError, Exception) as err:
        # Fall back to Python NumPy Cosine Similarity
        vector_search_method = "python_cosine"
        query_vec_np = np.array(query_vec, dtype=np.float32)
        query_norm = float(np.linalg.norm(query_vec_np))

        candidates = list(
            staged_hotels.find(
                {
                    "embedding_ready": True,
                    "price_usd": {"$lte": effective_hotel_ceiling},
                },
                {"_id": 1, "name": 1, "embedding": 1},
            )
        )

        scored_candidates = []
        for doc in candidates:
            emb = doc.get("embedding")
            if emb and len(emb) > 0:
                emb_np = np.array(emb, dtype=np.float32)
                emb_norm = float(np.linalg.norm(emb_np))
                if query_norm > 0 and emb_norm > 0:
                    score = float(np.dot(query_vec_np, emb_np) / (query_norm * emb_norm))
                else:
                    score = 0.0
                scored_candidates.append((score, doc["_id"]))

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        top_10_ids = [item[1] for item in scored_candidates[:10]]

        if top_10_ids:
            docs_by_id = {
                d["_id"]: d
                for d in staged_hotels.find(
                    {"_id": {"$in": top_10_ids}},
                    {"embedding": 0},
                )
            }
            hotels_vec = [docs_by_id[doc_id] for doc_id in top_10_ids if doc_id in docs_by_id]
        else:
            hotels_vec = []

    # -------------------------------------------------------------------------
    # Strategy C — Geospatial POI Search ($geoNear)
    # -------------------------------------------------------------------------
    poi_query: Dict[str, Any] = {"embedding_ready": True}
    if interests:
        poi_query["$or"] = [{"intent_tags": {"$in": interests}}]

    pipeline_c = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [lng, lat]},
                "distanceField": "dist_meters",
                "maxDistance": 50000,  # 50km radius
                "query": poi_query,
                "spherical": True,
            }
        },
        {"$sort": {"popularity_index": -1}},
        {"$limit": 25},
        {"$project": {"embedding": 0}},
    ]

    try:
        pois_list = list(staged_places.aggregate(pipeline_c))
    except Exception as e:
        print(f"⚠️ Strategy C ($geoNear places) warning: {e}")
        pois_list = []

    # -------------------------------------------------------------------------
    # Merge & Deduplicate Hotels by _id
    # -------------------------------------------------------------------------
    seen_ids = set()
    merged_hotels = []
    for h in hotels_geo + hotels_vec:
        h_id_str = str(h["_id"])
        if h_id_str not in seen_ids:
            seen_ids.add(h_id_str)
            merged_hotels.append(h)

    # Convert all ObjectIds to string
    merged_hotels_serialized = _convert_object_ids(merged_hotels)
    pois_list_serialized = _convert_object_ids(pois_list)

    return {
        "hotels": merged_hotels_serialized,
        "pois": pois_list_serialized,
        "query_metadata": {
            "destination_coords": params["destination_coords"],
            "budget_per_night": budget_per_night,
            "total_hotels_found": len(merged_hotels_serialized),
            "total_pois_found": len(pois_list_serialized),
            "vector_search_method": vector_search_method,
        },
    }


if __name__ == "__main__":
    test_params = {
        "destination_coords": {"lat": 6.0535, "lng": 80.2209},  # Galle, Sri Lanka
        "budget_max_usd": 500.0,
        "duration_days": 5,
        "interests": ["Historical", "Beach"],
        "custom_vibe": "quiet boutique hotel near Galle Fort with sea view",
        "party_size": 2,
    }
    result = retrieve_candidates(test_params)
    print(f"Hotels found: {len(result['hotels'])}")
    print(f"POIs found: {len(result['pois'])}")
    print(f"Vector search method: {result['query_metadata']['vector_search_method']}")
    if result["hotels"]:
        print(f"Top hotel: {result['hotels'][0]['name']} — ${result['hotels'][0]['price_usd']}/night")
    if result["pois"]:
        print(f"Top POI: {result['pois'][0]['name']} | Tags: {result['pois'][0].get('intent_tags')}")
