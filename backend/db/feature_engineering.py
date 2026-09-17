"""Feature engineering pipeline for travel staging database.

Enriches staged_hotels and staged_places with:
- Price tiers and binary amenity flags (wifi, pool, restaurant)
- Geospatial POI density (5km radius) and nearest airport baseline
- GeoJSON Point coordinates [lng, lat] for 2dsphere indexing
- Intent tags and min-max normalized popularity index for POIs
- Embedding readiness flag for downstream vectorizer

Performs in-place bulk updates in batches of 500.
"""

import sys
import time
from pathlib import Path
from typing import Dict, List, Any
from pymongo import UpdateOne

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

try:
    from backend.db.mongo_client import main_db
    from backend.geo.proximity import calculate_poi_density
    from backend.geo.airport_baseline import nearest_airport
except ImportError:
    from mongo_client import main_db
    from backend.geo.proximity import calculate_poi_density
    from backend.geo.airport_baseline import nearest_airport


def determine_price_tier(price_usd: float) -> str:
    """Classifies hotel pricing into tiers.
    
    Tiers:
    - 'Unknown' if price_usd == 0.0
    - 'Budget' if price_usd < 50
    - 'Standard' if 50 <= price_usd <= 150
    - 'Luxury' if price_usd > 150
    """
    if price_usd is None or price_usd == 0.0:
        return "Unknown"
    elif price_usd < 50.0:
        return "Budget"
    elif price_usd <= 150.0:
        return "Standard"
    else:
        return "Luxury"


def extract_amenity_flags(amenities: List[str]) -> Dict[str, int]:
    """Parses amenities list to produce binary 0/1 indicator flags."""
    lower_amenities = [str(a).lower() for a in (amenities or [])]
    combined_str = " ".join(lower_amenities)

    has_wifi = 1 if ("wifi" in combined_str or "wi-fi" in combined_str) else 0
    has_pool = 1 if ("pool" in combined_str) else 0
    has_restaurant = 1 if ("restaurant" in combined_str or "dining" in combined_str) else 0

    return {
        "has_wifi": has_wifi,
        "has_pool": has_pool,
        "has_restaurant": has_restaurant,
    }


def map_intent_tags(category: str, tags: List[str]) -> List[str]:
    """Maps POI category and tags to traveler intent categories.
    
    Keywords:
    - Historical: historic, monument, castle, fort, temple, church, mosque
    - Beach: beach, coast, bay, sea, ocean
    - Nature: nature, park, forest, wildlife, garden, waterfall
    - Adventure: adventure, hiking, climbing, sport
    - Urban: urban, shopping, market, restaurant, cafe, museum
    """
    search_text = f"{category or ''} {' '.join(tags or [])}".lower()
    intents = []

    if any(k in search_text for k in ["historic", "monument", "castle", "fort", "temple", "church", "mosque"]):
        intents.append("Historical")

    if any(k in search_text for k in ["beach", "coast", "bay", "sea", "ocean"]):
        intents.append("Beach")

    if any(k in search_text for k in ["nature", "park", "forest", "wildlife", "garden", "waterfall"]):
        intents.append("Nature")

    if any(k in search_text for k in ["adventure", "hiking", "climbing", "sport"]):
        intents.append("Adventure")

    if any(k in search_text for k in ["urban", "shopping", "market", "restaurant", "cafe", "museum"]):
        intents.append("Urban")

    if not intents:
        intents = ["Urban"]

    return intents


def process_hotels(staging_db, all_pois: List[Dict[str, Any]]) -> Dict[str, int]:
    """Engineers features for staged_hotels and performs in-place bulk updates."""
    hotels_col = staging_db["staged_hotels"]
    cursor = hotels_col.find({})
    total_hotels = hotels_col.count_documents({})

    print(f"[*] Processing {total_hotels:,} hotels for feature engineering...")

    bulk_ops: List[UpdateOne] = []
    processed_count = 0
    updated_count = 0
    failed_count = 0
    batch_size = 500

    for hotel in cursor:
        try:
            h_id = hotel["_id"]
            lat = float(hotel["lat"])
            lng = float(hotel["lng"])
            price_usd = float(hotel.get("price_usd", 0.0))
            amenities = hotel.get("amenities", [])

            # a) Price tier
            price_tier = determine_price_tier(price_usd)

            # b) POI density within 5km
            poi_density = calculate_poi_density(hotel, all_pois, radius_km=5.0)

            # c) Nearest airport
            airport_info = nearest_airport(lat, lng)

            # d) Amenity flags
            amenity_flags = extract_amenity_flags(amenities)

            # e) GeoJSON Point [lng, lat]
            location_geojson = {
                "type": "Point",
                "coordinates": [lng, lat],
            }

            # f) Embedding ready flag
            update_fields = {
                "price_tier": price_tier,
                "poi_density_5km": poi_density,
                "nearest_airport": airport_info,
                "has_wifi": amenity_flags["has_wifi"],
                "has_pool": amenity_flags["has_pool"],
                "has_restaurant": amenity_flags["has_restaurant"],
                "location": location_geojson,
                "embedding_ready": False,
            }

            bulk_ops.append(
                UpdateOne({"_id": h_id}, {"$set": update_fields})
            )
            processed_count += 1

            if len(bulk_ops) >= batch_size:
                res = hotels_col.bulk_write(bulk_ops, ordered=False)
                updated_count += res.matched_count
                bulk_ops = []

        except Exception as e:
            failed_count += 1
            print(f"[ERROR] Failed hotel {hotel.get('_id')}: {e}")

    # Flush remaining operations
    if bulk_ops:
        res = hotels_col.bulk_write(bulk_ops, ordered=False)
        updated_count += res.matched_count
        bulk_ops = []

    return {
        "processed": processed_count,
        "updated": updated_count,
        "failed": failed_count,
    }


def process_pois(staging_db) -> Dict[str, int]:
    """Engineers features for staged_places and performs in-place bulk updates."""
    places_col = staging_db["staged_places"]
    all_pois = list(places_col.find({}))
    total_pois = len(all_pois)

    print(f"[*] Processing {total_pois:,} POIs for feature engineering...")

    # Calculate min and max popularity_raw for normalization
    raw_popularities = [float(p.get("popularity_raw", 0.0)) for p in all_pois]
    min_pop = min(raw_popularities) if raw_popularities else 0.0
    max_pop = max(raw_popularities) if raw_popularities else 1.0
    pop_range = max_pop - min_pop

    bulk_ops: List[UpdateOne] = []
    processed_count = 0
    updated_count = 0
    failed_count = 0
    batch_size = 500

    for poi in all_pois:
        try:
            p_id = poi["_id"]
            lat = float(poi["lat"])
            lng = float(poi["lng"])
            cat = poi.get("category", "")
            tags = poi.get("tags", [])
            raw_pop = float(poi.get("popularity_raw", 0.0))

            # a) Intent tags
            intent_tags = map_intent_tags(cat, tags)

            # b) Min-max normalized popularity index (0.0 to 1.0)
            if pop_range > 0:
                norm_pop = round((raw_pop - min_pop) / pop_range, 4)
            else:
                norm_pop = 1.0

            # c) GeoJSON Point [lng, lat]
            location_geojson = {
                "type": "Point",
                "coordinates": [lng, lat],
            }

            # d) Embedding ready flag
            update_fields = {
                "intent_tags": intent_tags,
                "popularity_index": norm_pop,
                "location": location_geojson,
                "embedding_ready": False,
            }

            bulk_ops.append(
                UpdateOne({"_id": p_id}, {"$set": update_fields})
            )
            processed_count += 1

            if len(bulk_ops) >= batch_size:
                res = places_col.bulk_write(bulk_ops, ordered=False)
                updated_count += res.matched_count
                bulk_ops = []

        except Exception as e:
            failed_count += 1
            print(f"[ERROR] Failed POI {poi.get('_id')}: {e}")

    if bulk_ops:
        res = places_col.bulk_write(bulk_ops, ordered=False)
        updated_count += res.matched_count
        bulk_ops = []

    return {
        "processed": processed_count,
        "updated": updated_count,
        "failed": failed_count,
    }


def run_feature_engineering():
    """Main execution function for feature engineering."""
    start_time = time.time()
    staging_db = main_db.client["travel_staging"]

    print("=" * 65)
    print("STARTING FEATURE ENGINEERING PIPELINE")
    print(f"Target Staging Database: {staging_db.name}")
    print("=" * 65)

    # Cache all POIs in memory for fast hotel distance and density checks
    cached_pois = list(staging_db["staged_places"].find({}))
    print(f"[*] Cached {len(cached_pois):,} POIs into memory for fast spatial queries.")

    # 1. Process Hotels
    hotel_stats = process_hotels(staging_db, cached_pois)

    # 2. Process POIs
    poi_stats = process_pois(staging_db)

    elapsed = round(time.time() - start_time, 2)

    print("=" * 65)
    print("FEATURE ENGINEERING PIPELINE SUMMARY")
    print("=" * 65)
    print(f"{'Entity':<10} | {'Processed':<12} | {'Updated':<12} | {'Failed':<10}")
    print("-" * 65)
    print(
        f"{'Hotels':<10} | {hotel_stats['processed']:<12,} | "
        f"{hotel_stats['updated']:<12,} | {hotel_stats['failed']:<10,}"
    )
    print(
        f"{'POIs':<10} | {poi_stats['processed']:<12,} | "
        f"{poi_stats['updated']:<12,} | {poi_stats['failed']:<10,}"
    )
    print("-" * 65)
    print(f"Total Time Taken: {elapsed} seconds")
    print("=" * 65)


if __name__ == "__main__":
    run_feature_engineering()
