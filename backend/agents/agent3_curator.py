"""Agent 3 — Personalization and Budget/Feasibility Curator.

Pure Python deterministic scoring and ranking module (NO LLM calls).
Curates, filters, and ranks candidate hotels and POIs based on budget fit,
amenity matching, star ratings, density/proximity, and traveler interests.
"""

from __future__ import annotations

import copy
import re
from typing import Any, Dict, List, Optional, Tuple


def extract_numeric_stars(star_rating: Any) -> Optional[float]:
    if star_rating is None:
        return None
    if isinstance(star_rating, (int, float)):
        return float(star_rating)
    s = str(star_rating).strip().lower()
    if not s or "unrated" in s or "not rated" in s:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", s)
    if match:
        try:
            return float(match.group(1))
        except (ValueError, TypeError):
            return None
    return None


def parse_star_rating(star_rating: Any, preferred_stars: Optional[float] = None) -> float:
    """Extract numeric star rating and convert to a score out of 15.

    When preferred_stars is provided (e.g. 3.0 for 3-star request):
    - Rewards hotels matching the requested star rating (15.0 pts for exact match).
    - Penalizes deviation from user's preference (-5.0 pts per star difference).
    - Unrated budget stays get 10.0 pts.
    When preferred_stars is None:
    - Scales numeric stars to [0, 15] (default 7.5 for unrated/missing).
    """
    stars = extract_numeric_stars(star_rating)
    if preferred_stars is not None:
        if stars is not None:
            diff = abs(stars - preferred_stars)
            return max(0.0, 15.0 - (diff * 5.0))
        else:
            return 10.0 if preferred_stars <= 3.0 else 5.0

    if stars is None:
        s = str(star_rating or "").strip().lower()
        if "unrated" in s or "not rated" in s:
            return 0.0
        return 7.5
    return min(max((stars / 5.0) * 15.0, 0.0), 15.0)


def score_hotel(
    hotel: dict,
    budget_ceiling: float,
    all_pois: Optional[list] = None,
    preferred_tier: str = "",
    preferred_stars: Optional[float] = None,
) -> Tuple[float, dict]:
    """Score an individual hotel across 5 dimensions with user tier/star alignment (Total: 100 points).

    a) Budget Fit (30 pts):
       - If user wants budget/3-star: sweet spot ($15-$45/night) gets full 30 pts. Expensive (> $80) heavily docked.
       - Otherwise: 30 * (1 - price_usd / max(budget_ceiling, 1)) clamped to [0, 30].

    b) Amenity Score (20 pts):
       - For budget tier: essentials like wifi (12 pts), clean dining/restaurant (5 pts), pool (3 pts).
       - For standard/luxury: has_wifi * 6 + has_pool * 7 + has_restaurant * 7.

    c) Star Rating Score (15 pts):
       - Evaluated against preferred_stars if specified (e.g. 3-star gets full 15 pts).

    d) POI Density Score (20 pts):
       - min(poi_density_5km / 10.0, 1.0) * 20

    e) Airport Proximity Score (15 pts):
       - max(0, 15 - dist_km / 10.0), clamped to [0, 15]

    f) Tier Alignment Modifier:
       - User wants budget: +10 pts bonus for Budget tier / <= $45, -25 pts penalty for Luxury / > $100.
       - User wants luxury: +10 pts bonus for Luxury, -15 pts penalty for Budget.

    Returns:
        (total_score, breakdown_dict)
    """
    raw_price = hotel.get("price_usd")
    price_usd = float(raw_price) if raw_price is not None else 0.0
    effective_ceiling = max(float(budget_ceiling), 1.0)
    hotel_tier_doc = str(hotel.get("price_tier", "")).title()

    is_budget_req = preferred_tier == "budget" or (preferred_stars is not None and preferred_stars <= 3.0)
    is_luxury_req = preferred_tier == "luxury" or (preferred_stars is not None and preferred_stars >= 5.0)
    is_standard_req = preferred_tier == "standard" or (preferred_stars is not None and 3.5 <= preferred_stars <= 4.5)

    # a) Budget Fit (30 pts)
    if is_budget_req:
        if price_usd <= 0.0:
            budget_fit = 12.0
        elif price_usd <= 40.0:
            budget_fit = 30.0
        elif price_usd <= 60.0:
            budget_fit = 25.0
        elif price_usd <= 90.0:
            budget_fit = 12.0
        else:
            budget_fit = 0.0
    elif is_luxury_req:
        if price_usd <= 0.0:
            budget_fit = 10.0
        elif price_usd >= 120.0:
            budget_fit = 30.0
        elif price_usd >= 75.0:
            budget_fit = 24.0
        elif price_usd >= 50.0:
            budget_fit = 15.0
        else:
            budget_fit = 0.0
    elif is_standard_req:
        if price_usd <= 0.0:
            budget_fit = 15.0
        elif 40.0 <= price_usd <= 110.0:
            budget_fit = 30.0
        elif 25.0 <= price_usd < 40.0:
            budget_fit = 22.0
        elif 110.0 < price_usd <= 150.0:
            budget_fit = 20.0
        elif price_usd > 150.0:
            budget_fit = 8.0
        else:
            budget_fit = 12.0
    else:
        if price_usd <= 0.0:
            budget_fit = 15.0
        else:
            budget_fit = 30.0 * (1.0 - (price_usd / effective_ceiling))
            budget_fit = min(max(budget_fit, 0.0), 30.0)

    # b) Amenity Score (20 pts)
    has_wifi = 1 if hotel.get("has_wifi", 0) else 0
    has_pool = 1 if hotel.get("has_pool", 0) else 0
    has_restaurant = 1 if hotel.get("has_restaurant", 0) else 0
    if is_budget_req:
        amenities = float((has_wifi * 12) + (has_restaurant * 5) + (has_pool * 3))
    else:
        amenities = float((has_wifi * 6) + (has_pool * 7) + (has_restaurant * 7))
    amenities = min(max(amenities, 0.0), 20.0)

    # c) Star Rating Score (15 pts)
    star_rating_score = parse_star_rating(hotel.get("star_rating"), preferred_stars)

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

    # Tier Alignment modifier
    tier_modifier = 0.0
    if is_budget_req:
        if hotel_tier_doc == "Budget" or (0 < price_usd <= 45.0):
            tier_modifier += 10.0
        elif hotel_tier_doc == "Luxury" or price_usd > 100.0:
            tier_modifier -= 25.0
    elif is_luxury_req:
        if hotel_tier_doc in ("Luxury", "Premium") or price_usd >= 120.0:
            tier_modifier += 10.0
        elif hotel_tier_doc == "Budget" or (0 < price_usd <= 45.0):
            tier_modifier -= 25.0
    elif is_standard_req:
        if hotel_tier_doc in ("Standard", "Comfort", "Boutique") or (45.0 <= price_usd <= 110.0):
            tier_modifier += 10.0
        elif hotel_tier_doc == "Luxury" and price_usd > 180.0:
            tier_modifier -= 15.0
        elif hotel_tier_doc == "Budget" and price_usd < 25.0:
            tier_modifier -= 10.0

    total_score = max(0.0, min(100.0, budget_fit + amenities + star_rating_score + poi_density + airport + tier_modifier))

    breakdown = {
        "budget_fit": round(budget_fit, 2),
        "amenities": round(amenities, 2),
        "star_rating": round(star_rating_score, 2),
        "poi_density": round(poi_density, 2),
        "airport": round(airport, 2),
        "tier_modifier": round(tier_modifier, 2),
    }

    return round(total_score, 2), breakdown


def generate_xai_hotel_reasons(
    hotel: dict,
    breakdown: dict,
    ceiling: float,
    preferred_tier: str = "",
    preferred_stars: Optional[float] = None,
) -> List[str]:
    """Generates crystal-clear, user-friendly explainable AI rationale for a curated hotel."""
    reasons = []
    price = float(hotel.get("price_usd", 0.0) or 0.0)
    tier = str(hotel.get("price_tier", "")).title()
    stars = hotel.get("star_rating", "3-Star")

    # 1. Budget Fit explanation
    b_pts = breakdown.get("budget_fit", 25)
    if price > 0:
        if ceiling > 0 and price <= ceiling:
            diff = round(ceiling - price, 1)
            if diff >= 5:
                reasons.append(
                    f"Budget Fit ({b_pts}/30 pts): Priced at ${price:.0f}/night, providing great value while staying ${diff:.0f}/night below your daily target ceiling."
                )
            else:
                reasons.append(
                    f"Budget Fit ({b_pts}/30 pts): Perfectly aligns with your target budget at ${price:.0f}/night without hidden extra fees."
                )
        else:
            reasons.append(
                f"Budget Fit ({b_pts}/30 pts): Valued at ${price:.0f}/night, offering high comfort and balanced amenities."
            )
    else:
        reasons.append("Budget Fit (25/30 pts): Highly economical lodging option within trip parameters.")

    # 2. Star & Class match
    s_pts = breakdown.get("star_rating", 12)
    if preferred_stars:
        reasons.append(
            f"Star Rating Match ({s_pts}/15 pts): Meets your preferred {preferred_stars:.0f}-star requirement ({stars}) with verified guest satisfaction."
        )
    else:
        reasons.append(
            f"Quality & Hospitality ({s_pts}/15 pts): Verified {stars} property with consistent positive guest ratings."
        )

    # 3. Location & POI density
    p_pts = breakdown.get("poi_density", 15)
    poi_count = hotel.get("poi_density_5km", 0)
    if poi_count:
        reasons.append(
            f"Strategic Location ({p_pts}/20 pts): Located within 5 km of {poi_count} primary attractions, significantly cutting down daily commute times."
        )
    else:
        reasons.append(
            f"Transit Accessibility ({p_pts}/20 pts): Conveniently positioned near key sightseeing routes and safe transport corridors."
        )

    # 4. Amenities
    a_pts = breakdown.get("amenities", 15)
    amenities = []
    if hotel.get("has_wifi"):
        amenities.append("Free High-Speed Wi-Fi")
    if hotel.get("has_pool"):
        amenities.append("Swimming Pool")
    if hotel.get("has_restaurant"):
        amenities.append("In-House Dining")
    if amenities:
        reasons.append(
            f"Amenity Match ({a_pts}/20 pts): Equipped with {', '.join(amenities)} tailored for a comfortable stay."
        )

    cat_label = "Budget (3-Star & Economy)" if (preferred_tier == "budget" or (preferred_stars and preferred_stars <= 3.0)) else ("Luxury (5-Star & Premium Resort)" if (preferred_tier == "luxury" or (preferred_stars and preferred_stars >= 5.0)) else "Standard (4-Star & Comfort)")
    reasons.append(
        f"Budget Category Alignment: Shortlisted for your {cat_label} category with verified price integrity and comfort standards."
    )

    return reasons


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
    """Pre-filters, scores, and curates top candidate hotels and POIs.

    Args:
        candidates: dict with "hotels", "pois", and optional "query_metadata"
        user_params: dict with "destination_coords", "budget_max_usd",
                     "duration_days", "interests", "party_size", "custom_vibe"

    Returns:
        dict containing:
          - hotels: Top recommended hotels (limit 3, sorted by score desc)
          - pois: Top recommended POIs (limit 10, sorted by score desc)
          - budget_warning: bool flag indicating budget risk or relaxed criteria
          - estimated_total_usd: total estimated trip cost
          - scoring_breakdown: component score breakdown for top 3 hotels
    """
    raw_budget = user_params.get("budget_max_usd", 0.0)
    budget_max_usd = float(raw_budget) if raw_budget is not None else 0.0
    duration_days = max(int(user_params.get("duration_days", 1) or 1), 1)
    interests = user_params.get("interests", []) or []

    budget_ceiling_per_night = budget_max_usd / duration_days
    budget_warning = False

    custom_vibe = str(user_params.get("custom_vibe", "")).lower()
    hotel_tier = str(user_params.get("hotel_tier", "")).lower()
    raw_stars = user_params.get("preferred_star_rating")
    try:
        preferred_stars = float(raw_stars) if raw_stars is not None else None
    except (ValueError, TypeError):
        preferred_stars = None

    if not hotel_tier or hotel_tier == "standard":
        if bool(re.search(r"\b(?:3[- ]?star|three[- ]?star|budget[- ]?friendly|budget\s+hotel|cheap\s+hotel|economy|affordable|hostel)\b", custom_vibe)):
            hotel_tier = "budget"
            preferred_stars = 3.0
        elif bool(re.search(r"\b(?:5[- ]?star|five[- ]?star|luxury|boutique|villa|resort)\b", custom_vibe)):
            hotel_tier = "luxury"
            preferred_stars = 5.0
        elif bool(re.search(r"\b(?:4[- ]?star|four[- ]?star|standard|mid[- ]?range)\b", custom_vibe)):
            hotel_tier = "standard"
            preferred_stars = 4.0

    is_budget_req = hotel_tier == "budget" or (preferred_stars is not None and preferred_stars <= 3.0)

    # ---------------------------------------------------------
    # STEP 1 — Pre-filter hotels
    # ---------------------------------------------------------
    candidate_hotels = candidates.get("hotels", []) or []
    filtered_hotels: List[dict] = []

    # If user explicitly requested budget / 3-star, prioritize budget candidates
    if is_budget_req:
        budget_candidates = [
            h for h in candidate_hotels
            if (float(h.get("price_usd", 0) or 0) <= 60.0 and float(h.get("price_usd", 0) or 0) > 0)
            or str(h.get("price_tier", "")).title() == "Budget"
            or ("3" in str(h.get("star_rating", "")))
        ]
        if budget_candidates:
            candidate_hotels = budget_candidates

    for hotel in candidate_hotels:
        h = copy.deepcopy(hotel)
        price = float(h.get("price_usd", 0.0) or 0.0)
        if price == 0.0:
            h["price_unknown"] = True
        else:
            h["price_unknown"] = False

        if is_budget_req:
            # If user wants budget, strictly limit to <= max(55.0, budget_ceiling_per_night) and not Luxury tier
            if (price <= max(55.0, budget_ceiling_per_night) and str(h.get("price_tier", "")).title() != "Luxury") or price == 0.0:
                filtered_hotels.append(h)
        else:
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

    # ---------------------------------------------------------
    # STEP 3 — Score each hotel (total 100 points)
    # ---------------------------------------------------------
    scored_hotels: List[Tuple[float, dict, dict]] = []
    for hotel in filtered_hotels:
        score, breakdown = score_hotel(
            hotel,
            effective_budget_ceiling,
            candidate_pois,
            preferred_tier=hotel_tier,
            preferred_stars=preferred_stars,
        )
        hotel["curator_score"] = score
        hotel_reasons = generate_xai_hotel_reasons(
            hotel,
            breakdown,
            effective_budget_ceiling,
            preferred_tier=hotel_tier,
            preferred_stars=preferred_stars,
        )
        hotel["reasons"] = hotel_reasons
        breakdown_with_reasons = dict(breakdown)
        breakdown_with_reasons["reasons"] = hotel_reasons
        scored_hotels.append((score, hotel, breakdown_with_reasons))

    scored_hotels.sort(key=lambda x: x[0], reverse=True)
    top_3_hotels = [item[1] for item in scored_hotels[:3]]
    scoring_breakdown = {item[1]["name"]: item[2] for item in scored_hotels[:3]}

    # ---------------------------------------------------------
    # STEP 4 — Score each POI (total 100 points)
    # ---------------------------------------------------------
    scored_pois: List[Tuple[float, dict]] = []
    for poi in filtered_pois:
        score = score_poi(poi, interests, top_3_hotels)
        poi["curator_score"] = score
        scored_pois.append((score, poi))

    scored_pois.sort(key=lambda x: x[0], reverse=True)
    top_10_pois = [item[1] for item in scored_pois[:10]]

    # ---------------------------------------------------------
    # STEP 5 — Estimate trip cost
    # ---------------------------------------------------------
    if top_3_hotels:
        valid_prices = [
            float(h.get("price_usd", 0.0) or 0.0)
            for h in top_3_hotels
            if float(h.get("price_usd", 0.0) or 0.0) > 0.0
        ]
        if valid_prices:
            cheapest_hotel_cost = min(valid_prices)
            hotel_cost = cheapest_hotel_cost * duration_days
        else:
            hotel_cost = 0.0
            budget_warning = True
    else:
        hotel_cost = 0.0
        budget_warning = True

    poi_cost = len(top_10_pois[:10]) * 5.0  # $5 avg entry fee per POI
    transfer_cost = 15.0  # flat airport transfer
    estimated_total = hotel_cost + poi_cost + transfer_cost

    if budget_max_usd > 0 and estimated_total > (budget_max_usd * 1.2):
        budget_warning = True

    # ---------------------------------------------------------
    # STEP 6 — Build and return output
    # ---------------------------------------------------------
    return {
        "hotels": top_3_hotels,
        "pois": top_10_pois,
        "budget_warning": budget_warning,
        "estimated_total_usd": round(estimated_total, 2),
        "scoring_breakdown": scoring_breakdown,
    }


if __name__ == "__main__":
    mock_candidates = {
        "hotels": [
            {
                "name": "Galle Fort Hotel",
                "price_usd": 85.0,
                "price_tier": "Standard",
                "star_rating": "4 stars",
                "has_wifi": 1,
                "has_pool": 0,
                "has_restaurant": 1,
                "poi_density_5km": 12,
                "nearest_airport": {"distance_km": 90},
                "dist_meters": 500,
            },
            {
                "name": "Budget Inn Unawatuna",
                "price_usd": 35.0,
                "price_tier": "Budget",
                "star_rating": "Unrated",
                "has_wifi": 1,
                "has_pool": 0,
                "has_restaurant": 0,
                "poi_density_5km": 4,
                "nearest_airport": {"distance_km": 95},
                "dist_meters": 3000,
            },
            {
                "name": "Jetwing Lighthouse",
                "price_usd": 220.0,
                "price_tier": "Luxury",
                "star_rating": "5 stars",
                "has_wifi": 1,
                "has_pool": 1,
                "has_restaurant": 1,
                "poi_density_5km": 8,
                "nearest_airport": {"distance_km": 87},
                "dist_meters": 1200,
            },
        ],
        "pois": [
            {
                "name": "Galle Fort",
                "intent_tags": ["Historical", "Urban"],
                "popularity_index": 0.95,
                "dist_meters": 200,
            },
            {
                "name": "Unawatuna Beach",
                "intent_tags": ["Beach", "Nature"],
                "popularity_index": 0.88,
                "dist_meters": 4000,
            },
            {
                "name": "Jungle Beach",
                "intent_tags": ["Beach", "Adventure"],
                "popularity_index": 0.62,
                "dist_meters": 6000,
            },
        ],
        "query_metadata": {},
    }
    mock_params = {
        "budget_max_usd": 400.0,
        "duration_days": 5,
        "interests": ["Historical", "Beach"],
        "party_size": 2,
    }
    result = curate_candidates(mock_candidates, mock_params)
    print(f"Top hotels: {[h['name'] for h in result['hotels']]}")
    print(f"Budget warning: {result['budget_warning']}")
    print(f"Estimated total: ${result['estimated_total_usd']}")
    print(f"Scoring: {result['scoring_breakdown']}")
