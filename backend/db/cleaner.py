"""Data cleaning and validation pipeline for raw MongoDB travel collections.

Performs:
1. Extraction & schema validation with Pydantic v2 (HotelDocument, POIDocument).
2. Currency normalization (LKR -> USD @ 320, EUR -> USD @ 1.09).
3. Null/missing field handling with sensible defaults ('Unrated', 'No description available.').
4. HTML stripping & whitespace normalization via text_utils.
5. Construction of 'text_blob' for vector embeddings.
6. Geospatial + Fuzzy deduplication via Haversine (<= 50m) & rapidfuzz (> 85% similarity).
7. Ingestion into 'travel_staging' DB (staged_hotels, staged_places).
"""

import os
import sys
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Callable
from pydantic import ValidationError
from bs4 import BeautifulSoup
from rapidfuzz import fuzz

# Ensure project root and backend dir are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

try:
    from backend.db.mongo_client import scraper_db, main_db, get_collection
    from backend.db.schemas import HotelDocument, POIDocument
    from backend.db.text_utils import strip_html, normalize_whitespace, build_text_blob
except ImportError:
    from mongo_client import scraper_db, main_db, get_collection
    from schemas import HotelDocument, POIDocument
    from text_utils import strip_html, normalize_whitespace, build_text_blob

# Conversion rates specified:
# 1 USD = 320 LKR => LKR / 320.0
# 1 EUR = 1.09 USD => EUR * 1.09
RATE_LKR_TO_USD = 1.0 / 320.0
RATE_EUR_TO_USD = 1.09


def normalize_price(price_raw: Any, context_text: Optional[str] = "") -> float:
    """Normalizes price strings or numbers into a float representing price in USD."""
    if price_raw is None and not context_text:
        return 0.0

    if isinstance(price_raw, (int, float)):
        val = float(price_raw)
        # If raw number is large (e.g. 15,000+), assume LKR
        if val > 1000.0:
            return round(val * RATE_LKR_TO_USD, 2)
        return round(val, 2)

    raw_str = str(price_raw or "")
    combined = f"{raw_str} {context_text or ''}".strip()

    # Look for currency patterns
    # Match LKR / Rs.
    lkr_match = re.search(r"(?:LKR|Rs\.?|SLR)\s*([\d,]+(?:\.\d+)?)", combined, re.I)
    if lkr_match:
        try:
            num = float(lkr_match.group(1).replace(",", ""))
            return round(num * RATE_LKR_TO_USD, 2)
        except ValueError:
            pass

    # Match EUR / €
    eur_match = re.search(r"(?:EUR|€)\s*([\d,]+(?:\.\d+)?)", combined, re.I)
    if eur_match:
        try:
            num = float(eur_match.group(1).replace(",", ""))
            return round(num * RATE_EUR_TO_USD, 2)
        except ValueError:
            pass

    # Match USD / $
    usd_match = re.search(r"(?:USD|US\$|\$)\s*([\d,]+(?:\.\d+)?)", combined, re.I)
    if usd_match:
        try:
            num = float(usd_match.group(1).replace(",", ""))
            return round(num, 2)
        except ValueError:
            pass

    # Generic number fallback
    num_match = re.search(r"([\d,]+(?:\.\d+)?)", raw_str)
    if num_match:
        try:
            num = float(num_match.group(1).replace(",", ""))
            if num > 1000:
                return round(num * RATE_LKR_TO_USD, 2)
            return round(num, 2)
        except ValueError:
            pass

    return 0.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points in meters using Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def parse_hotel_raw(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extracts raw fields from raw_hotels document before schema validation."""
    raw_payload = doc.get("raw_payload", {})
    sf = raw_payload.get("scraped_fields", {})

    name = sf.get("name") or doc.get("name")
    if not name:
        return None

    lat = sf.get("latitude")
    lng = sf.get("longitude")
    if lat is None or lng is None:
        return None

    card_html = sf.get("card_html") or sf.get("html") or ""
    soup = BeautifulSoup(card_html, "html.parser") if card_html else None

    # Star rating extraction
    star_rating = "Unrated"
    if soup:
        stars_el = soup.find("div", {"data-testid": "rating-squares"})
        if stars_el and stars_el.find_parent():
            star_label = stars_el.find_parent().get("aria-label") or ""
            if star_label:
                star_rating = normalize_whitespace(star_label)

    # Reviews / score summary
    reviews = []
    if soup:
        score_el = soup.find("div", {"data-testid": "review-score"})
        if score_el:
            score_text = normalize_whitespace(score_el.get_text(separator=" ", strip=True))
            if score_text:
                reviews.append(score_text)
    
    # Description extraction
    description = ""
    if soup:
        # Booking.com typically has snippet descriptions in specific divs
        desc_div = soup.find("div", class_=re.compile(r"fff1944c52"))
        if desc_div:
            desc_text = normalize_whitespace(desc_div.get_text(strip=True))
            if desc_text and not desc_text.startswith("Scored") and "map" not in desc_text.lower():
                description = desc_text
    
    if not description:
        description = "No description available."

    # Amenities extraction
    amenities = []
    if soup:
        badge_els = soup.find_all("span", {"data-testid": "badge"})
        for b in badge_els:
            b_text = normalize_whitespace(b.get_text(strip=True))
            if b_text and b_text not in amenities:
                amenities.append(b_text)

    # Price normalization
    price_str = sf.get("price_str")
    price_usd = normalize_price(price_str, card_html)

    # Build text blob
    text_blob = build_text_blob(
        name=name,
        description=description,
        tags=amenities,
        reviews=reviews,
    )

    return {
        "name": name,
        "lat": lat,
        "lng": lng,
        "price_usd": price_usd,
        "star_rating": star_rating,
        "amenities": amenities,
        "description": description,
        "reviews": reviews,
        "source": doc.get("source", "booking"),
        "text_blob": text_blob,
    }


def parse_poi_raw(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extracts raw fields from raw_places document before schema validation."""
    raw_payload = doc.get("raw_payload", {})
    tags = raw_payload.get("tags", {})

    name = tags.get("name:en") or tags.get("name") or doc.get("name")
    if not name:
        return None

    lat = raw_payload.get("lat") or doc.get("lat")
    lng = raw_payload.get("lon") or raw_payload.get("lng") or doc.get("lng")
    if lat is None or lng is None:
        return None

    # Category determination
    category = (
        tags.get("amenity")
        or tags.get("tourism")
        or tags.get("historic")
        or tags.get("leisure")
        or tags.get("religion")
        or "attraction"
    )

    # Clean tags list
    tag_list = []
    for k in ["tourism", "historic", "amenity", "religion", "denomination"]:
        if k in tags:
            tag_list.append(f"{k}:{tags[k]}")

    # Description
    description = tags.get("description:en") or tags.get("description") or tags.get("note")
    if description:
        description = normalize_whitespace(strip_html(description))
    else:
        description = "No description available."

    # Reviews / notes
    reviews = []
    if tags.get("check_date"):
        reviews.append(f"Verified active: {tags.get('check_date')}")

    # Popularity metric: tag richness + presence of website/image/phone
    pop_score = 1.0 + len(tags) * 0.5
    if "image" in tags:
        pop_score += 3.0
    if "website" in tags:
        pop_score += 2.0
    if "wikipedia" in tags or "wikidata" in tags:
        pop_score += 4.0

    text_blob = build_text_blob(
        name=name,
        description=description,
        tags=tag_list,
        reviews=reviews,
    )

    return {
        "name": name,
        "lat": lat,
        "lng": lng,
        "category": category,
        "tags": tag_list,
        "description": description,
        "reviews": reviews,
        "popularity_raw": pop_score,
        "source": doc.get("source", "openstreetmap"),
        "text_blob": text_blob,
    }


def compute_completeness(item: Any) -> int:
    """Computes a data completeness score to prefer richer records during deduplication."""
    score = len(item.name)
    if hasattr(item, "description") and item.description != "No description available.":
        score += len(item.description)
    if hasattr(item, "price_usd") and item.price_usd > 0.0:
        score += 50
    if hasattr(item, "star_rating") and item.star_rating != "Unrated":
        score += 30
    if hasattr(item, "amenities"):
        score += len(item.amenities) * 10
    if hasattr(item, "tags"):
        score += len(item.tags) * 10
    if hasattr(item, "reviews"):
        score += len(item.reviews) * 15
    return score


def deduplicate_spatial_fuzzy(
    records: List[Any],
    name_sim_threshold: float = 85.0,
    max_dist_meters: float = 50.0,
) -> Tuple[List[Any], int]:
    """Deduplicates records using an optimized spatial grid + rapidfuzz similarity.
    
    Condition: name similarity > 85% AND distance <= 50 meters.
    Keeps record with highest completeness score.
    """
    if not records:
        return [], 0

    # Grid cell size: ~0.001 degrees latitude (~111 meters)
    CELL_SIZE = 0.001

    def cell_key(lat: float, lng: float) -> Tuple[int, int]:
        return (int(lat / CELL_SIZE), int(lng / CELL_SIZE))

    grid: Dict[Tuple[int, int], List[Any]] = {}
    for r in records:
        key = cell_key(r.lat, r.lng)
        grid.setdefault(key, []).append(r)

    removed_ids = set()

    for r1 in records:
        if id(r1) in removed_ids:
            continue

        cx, cy = cell_key(r1.lat, r1.lng)
        # Check current and 8 neighboring cells
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n_key = (cx + dx, cy + dy)
                if n_key not in grid:
                    continue

                for r2 in grid[n_key]:
                    if id(r1) == id(r2) or id(r2) in removed_ids:
                        continue

                    # Fast distance check first
                    dist = haversine_distance(r1.lat, r1.lng, r2.lat, r2.lng)
                    if dist <= max_dist_meters:
                        # Fuzzy name similarity
                        sim = fuzz.token_sort_ratio(r1.name, r2.name)
                        if sim > name_sim_threshold:
                            c1 = compute_completeness(r1)
                            c2 = compute_completeness(r2)
                            if c1 >= c2:
                                removed_ids.add(id(r2))
                            else:
                                removed_ids.add(id(r1))
                                break

                if id(r1) in removed_ids:
                    break

    deduped = [r for r in records if id(r) not in removed_ids]
    duplicates_removed = len(records) - len(deduped)
    return deduped, duplicates_removed


def run_cleaner():
    """Main ETL pipeline function."""
    print("=" * 70)
    print("STARTING DATA CLEANING & STAGING PIPELINE")
    print("=" * 70)

    staging_db = main_db.client["travel_staging"]
    staged_hotels_col = staging_db["staged_hotels"]
    staged_places_col = staging_db["staged_places"]

    # 1. Process Hotels
    raw_hotels_col = get_collection(scraper_db, "raw_hotels")
    total_raw_hotels = raw_hotels_col.count_documents({})
    print(f"[*] Reading {total_raw_hotels:,} records from 'raw_hotels'...")

    valid_hotels: List[HotelDocument] = []
    skipped_hotels = 0
    skip_reasons_hotels: Dict[str, int] = {}

    for doc in raw_hotels_col.find({}):
        try:
            parsed = parse_hotel_raw(doc)
            if not parsed:
                skipped_hotels += 1
                skip_reasons_hotels["missing_name_or_coords"] = (
                    skip_reasons_hotels.get("missing_name_or_coords", 0) + 1
                )
                continue

            hotel_obj = HotelDocument(**parsed)
            valid_hotels.append(hotel_obj)
        except ValidationError as ve:
            skipped_hotels += 1
            err_type = ve.errors()[0]["type"] if ve.errors() else "validation_error"
            skip_reasons_hotels[err_type] = skip_reasons_hotels.get(err_type, 0) + 1
        except Exception as e:
            skipped_hotels += 1
            skip_reasons_hotels[str(e)] = skip_reasons_hotels.get(str(e), 0) + 1

    print(f"[*] Validated hotels: {len(valid_hotels):,} | Skipped: {skipped_hotels:,}")
    if skip_reasons_hotels:
        print(f"    Skipped reasons: {skip_reasons_hotels}")

    # Deduplicate Hotels
    print("[*] Deduplicating hotels (rapidfuzz > 85% & distance <= 50m)...")
    deduped_hotels, hotel_dupes_removed = deduplicate_spatial_fuzzy(valid_hotels)
    print(f"[*] Duplicates removed: {hotel_dupes_removed:,} | Retained: {len(deduped_hotels):,}")

    # Write Staged Hotels
    print("[*] Writing cleaned hotels to 'travel_staging.staged_hotels'...")
    staged_hotels_col.delete_many({})
    if deduped_hotels:
        hotel_dicts = [h.model_dump() for h in deduped_hotels]
        # Insert in chunks of 2000
        chunk_size = 2000
        for i in range(0, len(hotel_dicts), chunk_size):
            staged_hotels_col.insert_many(hotel_dicts[i : i + chunk_size])

    hotels_written = staged_hotels_col.count_documents({})
    print(f"[SUCCESS] Staged hotels count in DB: {hotels_written:,}")

    # 2. Process POIs / Places
    print("-" * 70)
    raw_places_col = get_collection(scraper_db, "raw_places")
    total_raw_places = raw_places_col.count_documents({})
    print(f"[*] Reading {total_raw_places:,} records from 'raw_places'...")

    valid_pois: List[POIDocument] = []
    skipped_places = 0
    skip_reasons_places: Dict[str, int] = {}

    for doc in raw_places_col.find({}):
        try:
            parsed = parse_poi_raw(doc)
            if not parsed:
                skipped_places += 1
                skip_reasons_places["missing_name_or_coords"] = (
                    skip_reasons_places.get("missing_name_or_coords", 0) + 1
                )
                continue

            poi_obj = POIDocument(**parsed)
            valid_pois.append(poi_obj)
        except ValidationError as ve:
            skipped_places += 1
            err_type = ve.errors()[0]["type"] if ve.errors() else "validation_error"
            skip_reasons_places[err_type] = skip_reasons_places.get(err_type, 0) + 1
        except Exception as e:
            skipped_places += 1
            skip_reasons_places[str(e)] = skip_reasons_places.get(str(e), 0) + 1

    print(f"[*] Validated POIs: {len(valid_pois):,} | Skipped: {skipped_places:,}")
    if skip_reasons_places:
        print(f"    Skipped reasons: {skip_reasons_places}")

    # Deduplicate POIs
    print("[*] Deduplicating POIs (rapidfuzz > 85% & distance <= 50m)...")
    deduped_pois, poi_dupes_removed = deduplicate_spatial_fuzzy(valid_pois)
    print(f"[*] Duplicates removed: {poi_dupes_removed:,} | Retained: {len(deduped_pois):,}")

    # Write Staged POIs
    print("[*] Writing cleaned POIs to 'travel_staging.staged_places'...")
    staged_places_col.delete_many({})
    if deduped_pois:
        poi_dicts = [p.model_dump() for p in deduped_pois]
        staged_places_col.insert_many(poi_dicts)

    pois_written = staged_places_col.count_documents({})
    print(f"[SUCCESS] Staged POIs count in DB: {pois_written:,}")

    # Print Full Pipeline Summary
    print("=" * 70)
    print("DATA CLEANING PIPELINE SUMMARY")
    print("=" * 70)
    print(f"{'Metric':<30} | {'Hotels':<15} | {'POIs/Places':<15}")
    print("-" * 70)
    print(f"{'Total Raw Documents':<30} | {total_raw_hotels:<15,} | {total_raw_places:<15,}")
    print(f"{'Passed Validation':<30} | {len(valid_hotels):<15,} | {len(valid_pois):<15,}")
    print(f"{'Skipped Documents':<30} | {skipped_hotels:<15,} | {skipped_places:<15,}")
    print(f"{'Duplicates Removed':<30} | {hotel_dupes_removed:<15,} | {poi_dupes_removed:<15,}")
    print(f"{'Written to Staging DB':<30} | {hotels_written:<15,} | {pois_written:<15,}")
    print("=" * 70)


if __name__ == "__main__":
    run_cleaner()
