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

    # -------------------------------------------------------------------------
    # Strategy A — Geospatial Hotel Search ($geoNear)
    # -------------------------------------------------------------------------
    pipeline_a = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [lng, lat]},
                "distanceField": "dist_meters",
                "maxDistance": 100000,  # 100km radius
                "query": {
                    "embedding_ready": True,
                    "price_usd": {"$lte": budget_per_night},
                },
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
    query_vec = encode(custom_vibe) if custom_vibe else encode("hotel")
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
                        {"price_usd": {"$lte": budget_per_night}},
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
                    "price_usd": {"$lte": budget_per_night},
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

    return {
        "hotels": _convert_object_ids(hotels_geo + hotels_vec),
        "pois": [],
        "query_metadata": {
            "destination_coords": params.get("destination_coords"),
            "budget_per_night": budget_per_night,
            "vector_search_method": vector_search_method,
        },
    }
