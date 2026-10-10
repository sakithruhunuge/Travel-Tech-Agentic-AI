"""Tests for Agent 3 — Personalization and Budget/Feasibility Curator.

Covers:
- Star rating extraction and point conversion
- Multi-criteria hotel scoring (budget fit, amenities, ratings, POI density, airport proximity)
- Hotel ranking order (descending score)
- Budget warning triggers
- Estimated total cost calculation
- POI interest filtering and empty/unmatched fallbacks
- Candidate curation limits (top 5 hotels, POI shortlist)
"""

import pytest
from backend.agents.agent3_curator import (
    parse_star_rating,
    score_hotel,
    curate_candidates,
)


@pytest.mark.unit
def test_agent3_parse_star_rating():
    """parse_star_rating extracts numeric stars and scales to a score out of 15 points."""
    assert parse_star_rating("5 stars") == pytest.approx(15.0)
    assert parse_star_rating("4-star hotel") == pytest.approx(12.0)
    assert parse_star_rating("3 Stars") == pytest.approx(9.0)
    assert parse_star_rating(4.0) == pytest.approx(12.0)
    assert parse_star_rating("Unrated") == pytest.approx(0.0)
    assert parse_star_rating("Not Rated") == pytest.approx(0.0)
    assert parse_star_rating(None) == pytest.approx(7.5)
    assert parse_star_rating("") == pytest.approx(7.5)
    assert parse_star_rating("Unknown Luxury") == pytest.approx(7.5)


@pytest.mark.unit
def test_agent3_score_hotel_dimensions():
    """score_hotel calculates all 5 dimensions up to 100 maximum points."""
    budget_ceiling = 100.0  # $100/night

    perfect_hotel = {
        "price_usd": 50.0,      # (1 - 50/100) * 30 = 15.0 pts
        "has_wifi": 1,          # 6 pts
        "has_pool": 1,          # 7 pts
        "has_restaurant": 1,    # 7 pts (amenities total = 20 pts)
        "star_rating": "5 stars", # 15 pts
        "poi_density_5km": 10,  # 20 pts
        "nearest_airport": {"distance_km": 50.0}, # max(0, 15 - 5) = 10 pts
    }

    score, breakdown = score_hotel(perfect_hotel, budget_ceiling)

    assert breakdown["budget_fit"] == pytest.approx(15.0)
    assert breakdown["amenities"] == pytest.approx(20.0)
    assert breakdown["star_rating"] == pytest.approx(15.0)
    assert breakdown["poi_density"] == pytest.approx(20.0)
    assert breakdown["airport"] == pytest.approx(10.0)
    assert score == pytest.approx(80.0)
    assert 0.0 <= score <= 100.0



@pytest.mark.unit
def test_agent3_hotel_zero_price_fallback():
    """score_hotel assigns 15 pts default when price_usd is unknown or zero."""
    hotel = {"price_usd": 0.0}
    _, breakdown = score_hotel(hotel, 100.0)
    assert breakdown["budget_fit"] == pytest.approx(15.0)


@pytest.mark.unit
def test_agent3_curate_sorts_descending(sample_hotel_candidates, sample_poi_candidates, sample_user_params):
    """curate_candidates returns hotels sorted in descending order of curator_score."""
    candidates = {
        "hotels": sample_hotel_candidates,
        "pois": sample_poi_candidates,
    }

    curated = curate_candidates(candidates, sample_user_params)
    hotels = curated["hotels"]

    assert len(hotels) > 0
    scores = [h["curator_score"] for h in hotels]
    assert scores == sorted(scores, reverse=True), f"Hotels should be descending: {scores}"
    assert "scoring_breakdown" in curated


@pytest.mark.unit
def test_agent3_budget_warning_trigger():
    """curate_candidates flags budget_warning=True when all hotels exceed budget ceiling."""
    expensive_candidates = {
        "hotels": [
            {"name": "Ultra Resort", "price_usd": 500.0, "star_rating": "5 stars"},
            {"name": "Exclusive Villa", "price_usd": 400.0, "star_rating": "5 stars"},
        ],
        "pois": [{"name": "Galle Fort", "intent_tags": ["Historical"], "popularity_index": 0.9}],
    }
    user_params = {
        "destination": "Galle",
        "budget_max_usd": 150.0,  # $30/night for 5 days
        "duration_days": 5,
        "interests": ["Historical"],
    }

    curated = curate_candidates(expensive_candidates, user_params)
    assert curated["budget_warning"] is True


@pytest.mark.unit
def test_agent3_poi_interest_filtering(sample_poi_candidates):
    """curate_candidates filters POIs according to user interests."""
    candidates = {
        "hotels": [{"name": "Hotel A", "price_usd": 50.0}],
        "pois": sample_poi_candidates,
    }
    user_params = {
        "destination": "Galle",
        "budget_max_usd": 500.0,
        "duration_days": 5,
        "interests": ["Beach"],
    }

    curated = curate_candidates(candidates, user_params)
    pois = curated["pois"]

    # Jungle Beach has "Beach" tag
    poi_names = [p["name"] for p in pois]
    assert "Jungle Beach" in poi_names


@pytest.mark.unit
def test_agent3_empty_interests_fallback(sample_poi_candidates):
    """When interests are empty, all candidate POIs are preserved without error."""
    candidates = {
        "hotels": [{"name": "Hotel A", "price_usd": 50.0}],
        "pois": sample_poi_candidates,
    }
    user_params = {
        "destination": "Galle",
        "budget_max_usd": 500.0,
        "duration_days": 5,
        "interests": [],
    }

    curated = curate_candidates(candidates, user_params)
    assert len(curated["pois"]) == len(sample_poi_candidates)
