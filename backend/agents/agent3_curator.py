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
    """Score an individual hotel based on budget fit."""
    # a) Budget Fit (30 pts)
    raw_price = hotel.get("price_usd")
    price_usd = float(raw_price) if raw_price is not None else 0.0
    if price_usd <= 0.0:
        budget_fit = 15.0
    else:
        effective_ceiling = max(float(budget_ceiling), 1.0)
        budget_fit = 30.0 * (1.0 - (price_usd / effective_ceiling))
        budget_fit = min(max(budget_fit, 0.0), 30.0)

    total_score = budget_fit
    breakdown = {
        "budget_fit": round(budget_fit, 2),
    }

    return round(total_score, 2), breakdown
