"""RAG Readiness Validator and Auto-Repair Script for Travel Staging Database.

Audits 'staged_hotels' and 'staged_places' in 'travel_staging' for completeness
against all downstream RAG & vector search requirements.
"""

import sys
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Any

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

try:
    from backend.db.mongo_client import main_db
except ImportError:
    from mongo_client import main_db


def is_valid_float(val: Any) -> bool:
    return isinstance(val, (int, float)) and not isinstance(val, bool)


def check_hotel_doc(doc: Dict[str, Any]) -> List[str]:
    reasons = []
    # lat and lng
    if not is_valid_float(doc.get("lat")) or not is_valid_float(doc.get("lng")):
        reasons.append("invalid lat/lng")

    # price_usd
    if not is_valid_float(doc.get("price_usd")):
        reasons.append("price_usd not a float")

    # text_blob
    tb = doc.get("text_blob")
    if not isinstance(tb, str) or not tb.strip():
        reasons.append("text_blob empty or missing")

    # embedding
    emb = doc.get("embedding")
    if not isinstance(emb, list) or len(emb) != 384:
        reasons.append(f"embedding length is {len(emb) if isinstance(emb, list) else 'not a list'} (expected 384)")

    # embedding_ready
    if doc.get("embedding_ready") is not True:
        reasons.append("embedding_ready != True")

    # location GeoJSON Point
    loc = doc.get("location")
    if (
        not isinstance(loc, dict)
        or loc.get("type") != "Point"
        or not isinstance(loc.get("coordinates"), list)
        or len(loc.get("coordinates")) != 2
    ):
        reasons.append("location is not a valid GeoJSON Point [lng, lat]")

    # price_tier
    valid_tiers = {"Budget", "Standard", "Luxury", "Unknown"}
    if doc.get("price_tier") not in valid_tiers:
        reasons.append(f"price_tier '{doc.get('price_tier')}' not in {list(valid_tiers)}")

    return reasons


def check_place_doc(doc: Dict[str, Any]) -> List[str]:
    reasons = []
    # lat and lng
    if not is_valid_float(doc.get("lat")) or not is_valid_float(doc.get("lng")):
        reasons.append("invalid lat/lng")

    # text_blob
    tb = doc.get("text_blob")
    if not isinstance(tb, str) or not tb.strip():
        reasons.append("text_blob empty or missing")

    # embedding
    emb = doc.get("embedding")
    if not isinstance(emb, list) or len(emb) != 384:
        reasons.append(f"embedding length is {len(emb) if isinstance(emb, list) else 'not a list'} (expected 384)")

    # embedding_ready
    if doc.get("embedding_ready") is not True:
        reasons.append("embedding_ready != True")

    # location GeoJSON Point
    loc = doc.get("location")
    if (
        not isinstance(loc, dict)
        or loc.get("type") != "Point"
        or not isinstance(loc.get("coordinates"), list)
        or len(loc.get("coordinates")) != 2
    ):
        reasons.append("location is not a valid GeoJSON Point [lng, lat]")

    # intent_tags
    tags = doc.get("intent_tags")
    if not isinstance(tags, list) or len(tags) == 0:
        reasons.append("intent_tags empty or missing")

    return reasons


def auto_repair_collection(collection, is_hotel: bool = True) -> int:
    """Repairs fixable issues in collection documents:
    - Sets embedding_ready=False on docs missing embedding or invalid embedding
    - Fills missing/invalid price_tier based on price_usd (hotels only)
    """
    fixed_count = 0
    cursor = collection.find({})
    for doc in cursor:
        updates = {}
        emb = doc.get("embedding")
        if not isinstance(emb, list) or len(emb) != 384:
            if doc.get("embedding_ready") is not False:
                updates["embedding_ready"] = False

        if is_hotel:
            valid_tiers = {"Budget", "Standard", "Luxury", "Unknown"}
            tier = doc.get("price_tier")
            if tier not in valid_tiers:
                p = float(doc.get("price_usd", 0.0) or 0.0)
                if p <= 0:
                    updates["price_tier"] = "Unknown"
                elif p < 50:
                    updates["price_tier"] = "Budget"
                elif p <= 150:
                    updates["price_tier"] = "Standard"
                else:
                    updates["price_tier"] = "Luxury"

        if updates:
            collection.update_one({"_id": doc["_id"]}, {"$set": updates})
            fixed_count += 1

    return fixed_count


def run_rag_validation(fix: bool = False) -> Dict[str, Any]:
    """Audits staged_hotels and staged_places collections and prints report."""
    client = main_db.client
    staging_db = client["travel_staging"]

    hotels_col = staging_db["staged_hotels"]
    places_col = staging_db["staged_places"]

    if fix:
        print("[*] Running auto-repair (--fix)...")
        hotels_repaired = auto_repair_collection(hotels_col, is_hotel=True)
        places_repaired = auto_repair_collection(places_col, is_hotel=False)
        print(f"[*] Repaired {hotels_repaired} hotel docs and {places_repaired} place docs.")

    total_hotels = hotels_col.count_documents({})
    total_places = places_col.count_documents({})

    hotel_ready = 0
    hotel_failures = []
    for doc in hotels_col.find({}):
        issues = check_hotel_doc(doc)
        if not issues:
            hotel_ready += 1
        else:
            if len(hotel_failures) < 10:
                hotel_failures.append(f"Hotel _id {doc.get('_id')}: {'; '.join(issues)}")

    place_ready = 0
    place_failures = []
    for doc in places_col.find({}):
        issues = check_place_doc(doc)
        if not issues:
            place_ready += 1
        else:
            if len(place_failures) < 10:
                place_failures.append(f"Place _id {doc.get('_id')}: {'; '.join(issues)}")

    hotel_pct = round((hotel_ready / total_hotels * 100), 1) if total_hotels else 0.0
    place_pct = round((place_ready / total_places * 100), 1) if total_places else 0.0

    overall_ready = (hotel_pct >= 90.0 and place_pct >= 90.0)

    print("\n=== RAG READINESS REPORT ===")
    print(f"staged_hotels: {hotel_ready}/{total_hotels} documents ready ({hotel_pct}%)")
    print(f"staged_places: {place_ready}/{total_places} documents ready ({place_pct}%)")

    all_failures = hotel_failures + place_failures
    if all_failures:
        print("\nFailed documents (first 10):")
        for f in all_failures[:10]:
            print(f"  - {f}")
    else:
        print("\nFailed documents: None! 100% compliance.")

    print(f"\n=== OVERALL: {'READY' if overall_ready else 'NOT READY'} ===\n")

    return {
        "overall_ready": overall_ready,
        "hotels": {"ready": hotel_ready, "total": total_hotels, "pct": hotel_pct},
        "places": {"ready": place_ready, "total": total_places, "pct": place_pct},
        "failures": all_failures[:10],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit and validate RAG readiness of travel_staging DB.")
    parser.add_argument("--fix", action="store_true", help="Auto-repair fixable issues in staged collections.")
    args = parser.parse_args()

    run_rag_validation(fix=args.fix)
