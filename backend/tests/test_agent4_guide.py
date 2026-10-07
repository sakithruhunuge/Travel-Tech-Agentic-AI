"""Tests for Agent 4 — The Itinerary Explainer & Markdown Synthesis Agent.

Covers:
- Synthesis prompt formulation (_build_user_message)
- Deterministic template itinerary generator (_generate_template_itinerary)
- Multi-destination itinerary layout and routing
- Day-by-day structure validation (Morning, Afternoon, Evening, Hotel, Day Cost)
- Preserving curated hotels and POIs
- Budget breakdown table formatting and warning alerts
- Fallback synthesis when LLM is unavailable or fails
"""

import pytest
from unittest.mock import patch
from backend.agents.agent4_guide import (
    _build_user_message,
    _generate_template_itinerary,
    generate_itinerary,
)


@pytest.mark.unit
def test_agent4_build_user_message(sample_curated_data, sample_user_params):
    """_build_user_message creates a comprehensive prompt including user parameters and curated items."""
    msg = _build_user_message(sample_curated_data, sample_user_params)

    assert "Galle" in msg
    assert "Fort Heritage Villa" in msg
    assert "Galle Dutch Fort" in msg
    assert "budget" in msg.lower()


@pytest.mark.unit
def test_agent4_template_itinerary_structure(sample_curated_data, sample_user_params):
    """_generate_template_itinerary adheres strictly to the required Markdown contract."""
    md = _generate_template_itinerary(sample_curated_data, sample_user_params)

    # 1. Main Header
    assert "# 🌴 Your Sri Lanka Itinerary:" in md
    assert "Galle" in md
    assert "(5 Days)" in md

    # 2. Key Sections
    assert "## Overview" in md
    assert "## Day 1:" in md
    assert "## Day 5:" in md
    assert "## 💡 Why These Recommendations?" in md
    assert "## 💰 Budget Breakdown" in md

    # 3. Daily Segments
    assert "**🌅 Morning:**" in md
    assert "**☀️ Afternoon:**" in md
    assert "**🌙 Evening:**" in md
    assert "**🏨 Tonight's Stay:**" in md
    assert "**💰 Estimated Day Cost:**" in md

    # 4. Budget Table
    assert "| Item | Estimated Cost |" in md
    assert "| Accommodation" in md
    assert "| **Estimated Total** |" in md


@pytest.mark.unit
def test_agent4_multi_destination_itinerary(sample_curated_data, sample_multi_dest_params):
    """_generate_template_itinerary formats multi-destination journeys with sequential routing."""
    md = _generate_template_itinerary(sample_curated_data, sample_multi_dest_params)

    # Route arrow indicator
    assert "Kandy ➔ Galle ➔ Colombo" in md
    assert "(6 Days)" in md
    # Days are distributed across destinations
    assert "Day 1:" in md
    assert "Day 6:" in md


@pytest.mark.unit
def test_agent4_budget_warning_alert(sample_curated_data, sample_user_params):
    """_generate_template_itinerary conditionally appends a warning note if budget_warning is True."""
    # When False: no warning
    sample_curated_data["budget_warning"] = False
    md_clean = _generate_template_itinerary(sample_curated_data, sample_user_params)
    assert "> ⚠️ Note: Your selected destination and dates may be slightly over budget" not in md_clean

    # When True: warning present
    sample_curated_data["budget_warning"] = True
    md_warning = _generate_template_itinerary(sample_curated_data, sample_user_params)
    assert "> ⚠️ Note: Your selected destination and dates may be slightly over budget" in md_warning


@pytest.mark.unit
def test_agent4_generate_itinerary_llm_fallback(sample_curated_data, sample_user_params):
    """generate_itinerary gracefully falls back to deterministic template when LLM throws exception."""
    with patch("backend.agents.agent4_guide.get_llm", side_effect=Exception("API connection timeout")):
        result_md = generate_itinerary(sample_curated_data, sample_user_params)

        assert isinstance(result_md, str)
        assert len(result_md) > 200
        assert "# 🌴 Your Sri Lanka Itinerary:" in result_md
        assert "Galle" in result_md
