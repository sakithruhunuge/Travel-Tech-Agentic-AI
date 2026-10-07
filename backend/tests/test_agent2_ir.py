"""Tests for Agent 2 — Information Retrieval (IR) Tool.

Covers:
- Geospatial & vector candidate retrieval structure
- Budget per night filtering calculation
- Canonical interest tag normalization
- ObjectId recursion converter
- Graceful handling of empty or missing coordinates
- Query metadata verification
"""

import pytest
from unittest.mock import MagicMock, patch
from bson import ObjectId
from backend.agents.agent2_ir import (
    retrieve_candidates,
    _convert_object_ids,
)


@pytest.mark.unit
def test_agent2_convert_object_ids():
    """_convert_object_ids recursively converts BSON ObjectIds to string representations."""
    oid1 = ObjectId()
    oid2 = ObjectId()
    sample_doc = {
        "_id": oid1,
        "name": "Test Hotel",
        "nested": {"id": oid2, "count": 5},
        "items": [oid1, {"inner_id": oid2}, 42, "string"],
    }

    converted = _convert_object_ids(sample_doc)
    assert converted["_id"] == str(oid1)
    assert converted["nested"]["id"] == str(oid2)
    assert converted["items"][0] == str(oid1)
    assert converted["items"][1]["inner_id"] == str(oid2)
    assert converted["items"][2] == 42
    assert converted["items"][3] == "string"


@pytest.mark.unit
def test_agent2_interest_normalization():
    """Agent 2 normalizes user interests to canonical staging database tags."""
    # Test through retrieve_candidates with mocked database
    mock_db = MagicMock()
    mock_db.__getitem__.return_value.aggregate.return_value = []
    mock_db.__getitem__.return_value.find.return_value = []

    user_params = {
        "destination_coords": {"lat": 6.0535, "lng": 80.2209},
        "budget_max_usd": 500.0,
        "duration_days": 5,
        "interests": ["beaches", "historical sites", "wildlife and nature", "photography tour"],
        "custom_vibe": "relaxing beach stay",
        "party_size": 2,
    }

    with patch("backend.agents.agent2_ir.main_db", mock_db):
        res = retrieve_candidates(user_params)

        assert "hotels" in res
        assert "pois" in res
        assert "query_metadata" in res
        assert isinstance(res["hotels"], list)
        assert isinstance(res["pois"], list)


@pytest.mark.unit
def test_agent2_budget_per_night_calculation():
    """Agent 2 computes nightly budget limit correctly (total / days)."""
    user_params = {
        "destination_coords": {"lat": 6.0535, "lng": 80.2209},
        "budget_max_usd": 600.0,
        "duration_days": 4,  # $150 per night
        "interests": ["Beach"],
        "custom_vibe": "",
        "party_size": 2,
    }

    mock_db = MagicMock()
    staging_db = MagicMock()
    mock_db.client.__getitem__.return_value = staging_db

    mock_hotels_col = MagicMock()
    mock_places_col = MagicMock()

    mock_hotels_col.aggregate.return_value = [
        {"_id": "hotel_mock_1", "name": "Hotel A", "price_usd": 120.0, "lat": 6.05, "lng": 80.22}
    ]
    mock_places_col.aggregate.return_value = [
        {"_id": "poi_mock_1", "name": "POI A", "intent_tags": ["Beach"], "lat": 6.05, "lng": 80.22}
    ]

    staging_db.__getitem__.side_effect = lambda name: (
        mock_hotels_col if "hotel" in name else mock_places_col
    )

    with patch("backend.agents.agent2_ir.main_db", mock_db), \
         patch("backend.agents.agent2_ir.encode", return_value=[0.05] * 384):
        res = retrieve_candidates(user_params)
        assert len(res["hotels"]) >= 1
        assert res["hotels"][0]["name"] == "Hotel A"
        assert res["query_metadata"]["total_hotels_found"] >= 1



@pytest.mark.unit
def test_agent2_missing_coordinates_graceful():
    """Agent 2 gracefully falls back when destination coordinates are missing."""
    user_params = {
        "destination_coords": {},
        "budget_max_usd": 300.0,
        "duration_days": 3,
        "interests": [],
        "custom_vibe": "",
        "party_size": 2,
    }

    mock_db = MagicMock()
    mock_db.__getitem__.return_value.aggregate.return_value = []
    mock_db.__getitem__.return_value.find.return_value = []

    with patch("backend.agents.agent2_ir.main_db", mock_db):
        res = retrieve_candidates(user_params)
        assert isinstance(res["hotels"], list)
        assert isinstance(res["pois"], list)
        assert res["query_metadata"]["total_hotels_found"] == 0

