"""Agent 3 — Personalization and Budget/Feasibility Curator.

Pure Python deterministic scoring and ranking module (NO LLM calls).
Curates, filters, and ranks candidate hotels and POIs based on budget fit,
amenity matching, star ratings, density/proximity, and traveler interests.
"""

from __future__ import annotations

import copy
import re
from typing import Any, Dict, List, Optional, Tuple


def parse_star_rating(star_rating: Any) -> float:
    """Extract numeric star rating and convert to a score out of 15.

    Rules:
    - "5 stars" -> 5.0 -> 15.0 pts
    - "4-star hotel" -> 4.0 -> 12.0 pts
    - "Unrated" / "None" -> 0.0 pts
    - Unparseable / missing -> 7.5 pts default
    - Score formula: (numeric_stars / 5.0) * 15.0
    """
    if star_rating is None:
        return 7.5

    if isinstance(star_rating, (int, float)):
        numeric_stars = float(star_rating)
        return min(max((numeric_stars / 5.0) * 15.0, 0.0), 15.0)

    s = str(star_rating).strip()
    if not s:
        return 7.5

    s_lower = s.lower()
    if "unrated" in s_lower or "not rated" in s_lower:
        return 0.0

    match = re.search(r"(\d+(?:\.\d+)?)", s)
    if match:
        try:
            numeric_stars = float(match.group(1))
            return min(max((numeric_stars / 5.0) * 15.0, 0.0), 15.0)
        except (ValueError, TypeError):
            return 7.5

    return 7.5


def score_hotel(
    hotel: dict, budget_ceiling: float, all_pois: Optional[list] = None
) -> Tuple[float, dict]:
    """Score an individual hotel across 5 dimensions (Total: 100 points).

    a) Budget Fit (30 pts):
       - If price_usd == 0: 15 pts (unknown price)
       - Else: 30 * (1 - price_usd / max(budget_ceiling, 1)), clamped to [0, 30]

    b) Amenity Score (20 pts):
       - has_wifi * 6 + has_pool * 7 + has_restaurant * 7 (max 20)

    c) Star Rating Score (15 pts):
       - Extracted numeric stars / 5.0 * 15 (default 7.5 if unparseable, 0 if Unrated)

    d) POI Density Score (20 pts):
       - min(poi_density_5km / 10.0, 1.0) * 20

    e) Airport Proximity Score (15 pts):
       - max(0, 15 - dist_km / 10.0), clamped to [0, 15]

    Returns:
        (total_score, breakdown_dict)
    """
    # a) Budget Fit (30 pts)
    raw_price = hotel.get("price_usd")
    price_usd = float(raw_price) if raw_price is not None else 0.0
    if price_usd <= 0.0:
        budget_fit = 15.0
    else:
        effective_ceiling = max(float(budget_ceiling), 1.0)
        budget_fit = 30.0 * (1.0 - (price_usd / effective_ceiling))
        budget_fit = min(max(budget_fit, 0.0), 30.0)

    # b) Amenity Score (20 pts)
    has_wifi = 1 if hotel.get("has_wifi", 0) else 0
    has_pool = 1 if hotel.get("has_pool", 0) else 0
    has_restaurant = 1 if hotel.get("has_restaurant", 0) else 0
    amenities = float((has_wifi * 6) + (has_pool * 7) + (has_restaurant * 7))
    amenities = min(max(amenities, 0.0), 20.0)

    # c) Star Rating Score (15 pts)
    star_rating_score = parse_star_rating(hotel.get("star_rating"))

    # d) POI Density Score (20 pts)
    poi_density_5km = float(hotel.get("poi_density_5km", 0) or 0)
    poi_density = min(max(poi_density_5km / 10.0, 0.0), 1.0) * 20.0

    # e) Airport Proximity Score (15 pts)
    nearest_airport = hotel.get("nearest_airport") or {}
    airport_dist = nearest_airport.get("distance_km", 999.0)
    if airport_dist is None:
        airport_dist = 999.0
    else:
        try:
            airport_dist = float(airport_dist)
        except (ValueError, TypeError):
            airport_dist = 999.0

    airport = max(0.0, 15.0 - (airport_dist / 10.0))
    airport = min(15.0, airport)

    total_score = budget_fit + amenities + star_rating_score + poi_density + airport

    breakdown = {
        "budget_fit": round(budget_fit, 2),
        "amenities": round(amenities, 2),
        "star_rating": round(star_rating_score, 2),
        "poi_density": round(poi_density, 2),
        "airport": round(airport, 2),
    }

    return round(total_score, 2), breakdown


def score_poi(
    poi: dict, interests: list, hotel_shortlist: Optional[list] = None
) -> float:
    """Score an individual POI across 3 dimensions (Total: 100 points).

    a) Interest Match (40 pts):
       - If interests specified and any intent_tag in interests: 40 pts
       - If interests empty: 20 pts (neutral)
       - If interests specified and none match: 0 pts

    b) Popularity Index (30 pts):
       - popularity_index * 30

    c) Proximity Score (30 pts):
       - max(0, 30 * (1 - dist_meters / 50000)), clamped to [0, 30]

    Returns:
        total_score (float)
    """
    # a) Interest Match (40 pts)
    poi_tags = poi.get("intent_tags") or []
    interests_clean = [str(i).strip().lower() for i in interests if i] if interests else []
    poi_tags_clean = [str(t).strip().lower() for t in poi_tags if t]

    if interests:
        if any(t in interests for t in poi_tags) or any(
            t in interests_clean for t in poi_tags_clean
        ):
            interest_score = 40.0
        else:
            interest_score = 0.0
    else:
        interest_score = 20.0

    # b) Popularity Index (30 pts)
    raw_pop = poi.get("popularity_index", 0.0)
    try:
        popularity_index = float(raw_pop) if raw_pop is not None else 0.0
    except (ValueError, TypeError):
        popularity_index = 0.0
    popularity_score = min(max(popularity_index * 30.0, 0.0), 30.0)

    # c) Proximity Score (30 pts)
    raw_dist = poi.get("dist_meters", 50000)
    try:
        dist_meters = float(raw_dist) if raw_dist is not None else 50000.0
    except (ValueError, TypeError):
        dist_meters = 50000.0

    proximity_score = max(0.0, 30.0 * (1.0 - (dist_meters / 50000.0)))
    proximity_score = min(30.0, proximity_score)

    total_score = interest_score + popularity_score + proximity_score
    return round(total_score, 2)


def curate_candidates(candidates: dict, user_params: dict) -> dict:
    """Pre-filters, scores, and curates top candidate hotels and POIs."""
    raw_budget = user_params.get("budget_max_usd", 0.0)
    budget_max_usd = float(raw_budget) if raw_budget is not None else 0.0
    duration_days = max(int(user_params.get("duration_days", 1) or 1), 1)
    interests = user_params.get("interests", []) or []

    budget_ceiling_per_night = budget_max_usd / duration_days
    budget_warning = False

    # ---------------------------------------------------------
    # STEP 1 — Pre-filter hotels
    # ---------------------------------------------------------
    candidate_hotels = candidates.get("hotels", []) or []
    filtered_hotels: List[dict] = []

    for hotel in candidate_hotels:
        h = copy.deepcopy(hotel)
        price = float(h.get("price_usd", 0.0) or 0.0)
        if price == 0.0:
            h["price_unknown"] = True
        else:
            h["price_unknown"] = False

        if price <= budget_ceiling_per_night or price == 0.0:
            filtered_hotels.append(h)

    effective_budget_ceiling = budget_ceiling_per_night

    # If no hotels pass filter, relax to 1.5x the budget ceiling and set budget_warning = True
    if not filtered_hotels and candidate_hotels:
        budget_warning = True
        relaxed_ceiling = budget_ceiling_per_night * 1.5
        effective_budget_ceiling = relaxed_ceiling

        for hotel in candidate_hotels:
            h = copy.deepcopy(hotel)
            price = float(h.get("price_usd", 0.0) or 0.0)
            if price == 0.0:
                h["price_unknown"] = True
            else:
                h["price_unknown"] = False

            if price <= relaxed_ceiling or price == 0.0:
                filtered_hotels.append(h)

        # Fallback to keep all hotels if none pass even relaxed ceiling
        if not filtered_hotels:
            for hotel in candidate_hotels:
                h = copy.deepcopy(hotel)
                price = float(h.get("price_usd", 0.0) or 0.0)
                h["price_unknown"] = price == 0.0
                filtered_hotels.append(h)
    elif not candidate_hotels:
        budget_warning = True

    # ---------------------------------------------------------
    # STEP 2 — Pre-filter POIs
    # ---------------------------------------------------------
    candidate_pois = candidates.get("pois", []) or []
    filtered_pois: List[dict] = []

    if interests:
        interests_norm = {str(i).strip().lower() for i in interests if i}
        for poi in candidate_pois:
            p = copy.deepcopy(poi)
            tags_norm = {str(t).strip().lower() for t in p.get("intent_tags", []) if t}
            if any(t in interests for t in p.get("intent_tags", [])) or interests_norm.intersection(tags_norm):
                filtered_pois.append(p)

        # If no POIs match specific interests, fallback to keep all to preserve utility
        if not filtered_pois and candidate_pois:
            filtered_pois = [copy.deepcopy(p) for p in candidate_pois]
    else:
        filtered_pois = [copy.deepcopy(p) for p in candidate_pois]

    return {"filtered_hotels": filtered_hotels, "filtered_pois": filtered_pois, "budget_warning": budget_warning}
