"""Agent 3 — Personalization and Budget/Feasibility Curator.

Pure Python deterministic scoring and ranking module (NO LLM calls).
Curates, filters, and ranks candidate hotels and POIs based on budget fit,
amenity matching, star ratings, density/proximity, and traveler interests.
"""

from __future__ import annotations

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
    """Score an individual hotel across budget, amenities, star rating, POI density, and airport proximity."""
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
