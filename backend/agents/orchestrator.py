"""Full 4-Agent Orchestrator Pipeline for Sri Lanka Travel Agentic AI.

Coordinates the end-to-end execution of:
1. Agent 1: NLP Triage (intent extraction & safety checks)
2. Agent 2: Information Retrieval (geospatial MongoDB & vector search)
3. Agent 3: Personalization & Feasibility Curator (deterministic scoring & budget fit)
4. Agent 4: Itinerary Explainer & Synthesizer (Markdown day-by-day generation)
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import Any, Dict

# Ensure project root is accessible for absolute imports
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Structured logging setup
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("orchestrator")

try:
    from backend.agents import agent1_triage, agent2_ir, agent3_curator, agent4_guide
except (ImportError, ModuleNotFoundError):
    import agent1_triage
    import agent2_ir
    import agent3_curator
    import agent4_guide


KNOWN_LOCATIONS = {
    "Colombo": (6.9271, 79.8612),
    "Negombo": (7.2008, 79.8737),
    "Jaffna": (9.6615, 80.0255),
    "Batticaloa": (7.717, 81.7),
    "Mannar": (8.981, 79.904),
    "Sigiriya": (7.957, 80.76),
    "Dambulla": (7.8742, 80.6511),
    "Kandy": (7.2906, 80.6337),
    "Anuradhapura": (8.3114, 80.4037),
    "Polonnaruwa": (7.9403, 81.0188),
    "Pinnawala": (7.3015, 80.3847),
    "Ella": (6.8667, 81.0466),
    "Nuwara Eliya": (6.9497, 80.7891),
    "Badulla": (6.9934, 81.055),
    "Haputale": (6.7682, 80.9507),
    "Horton Plains": (6.8028, 80.8092),
    "Knuckles Range": (7.4589, 80.7892),
    "Kitulgala": (6.9961, 80.4106),
    "Ratnapura": (6.6828, 80.3992),
    "Galle": (6.0535, 80.221),
    "Bentota": (6.423, 79.9984),
    "Beruwala": (6.4788, 79.9828),
    "Mirissa": (5.9483, 80.4716),
    "Weligama": (5.9722, 80.4289),
    "Unawatuna": (6.0094, 80.2486),
    "Hikkaduwa": (6.1392, 80.1011),
    "Tangalle": (6.0244, 80.7941),
    "Matara": (5.9496, 80.5469),
    "Trincomalee": (8.5874, 81.2152),
    "Pasikuda": (7.9228, 81.5647),
    "Arugam Bay": (6.8415, 81.8358),
    "Kalpitiya": (8.2294, 79.7618),
    "Yala": (6.3725, 81.516),
    "Udawalawe": (6.4746, 80.8986),
    "Wilpattu": (8.4526, 80.0545),
    "Sinharaja": (6.4167, 80.4167),
    "Minneriya": (8.0333, 80.9),
    "Kaudulla": (8.136, 80.916),
    "Tissamaharama": (6.2796, 81.2863),
}


def find_nearest_known_city(lat, lng):
    if lat is None or lng is None:
        return None
    try:
        best_name = None
        min_dist = float("inf")
        for name, (c_lat, c_lng) in KNOWN_LOCATIONS.items():
            dist = (float(lat) - c_lat) ** 2 + (float(lng) - c_lng) ** 2
            if dist < min_dist:
                min_dist = dist
                best_name = name
        return best_name
    except Exception:
        return None


def run_agent_pipeline(raw_user_prompt: str) -> dict:
    """Executes the full 4-agent pipeline sequentially with structured logging and timings."""
    timings = {}

    try:
        logger.info(f"Pipeline started | prompt_length={len(raw_user_prompt)} chars")

        # Agent 1: NLP Triage
        t0 = time.time()
        params = agent1_triage.parse_user_query(raw_user_prompt)
        t_agent1 = round(time.time() - t0, 2)
        timings["agent1_triage_s"] = t_agent1

        if "error" in params:
            err = params["error"]
            logger.warning(f"Agent 1 returned error: {err}")
            return {"error": err, "agent_timings": timings}

        primary_destination = params.get("destination", "")
        dest_coords = params.get("destination_coords", {})

        logger.info(
            f"Agent 1 complete | destination={primary_destination} | duration_s={t_agent1}"
        )

        # Agent 2: Information Retrieval
        t0 = time.time()
        candidates = agent2_ir.retrieve_candidates(params)
        t_agent2 = round(time.time() - t0, 2)
        timings["agent2_ir_s"] = t_agent2

        hotels_found = len(candidates.get("hotels", []))
        pois_found = len(candidates.get("pois", []))
        method = candidates.get("query_metadata", {}).get("vector_search_method", "unknown")
        logger.info(
            f"Agent 2 complete | hotels_found={hotels_found} | pois_found={pois_found} | method={method} | duration_s={t_agent2}"
        )

        # Agent 3: Personalization & Curation
        t0 = time.time()
        curated = agent3_curator.curate_candidates(candidates, params)
        t_agent3 = round(time.time() - t0, 2)
        timings["agent3_curator_s"] = t_agent3

        hotels_shortlisted = len(curated.get("hotels", []))
        pois_shortlisted = len(curated.get("pois", []))
        budget_warning = curated.get("budget_warning", False)
        logger.info(
            f"Agent 3 complete | hotels_shortlisted={hotels_shortlisted} | pois_shortlisted={pois_shortlisted} | budget_warning={budget_warning}"
        )

        # Agent 4: Itinerary Generation
        t0 = time.time()
        itinerary_md = agent4_guide.generate_itinerary(curated, params)
        t_agent4 = round(time.time() - t0, 2)
        timings["agent4_guide_s"] = t_agent4

        logger.info(
            f"Agent 4 complete | itinerary_length={len(itinerary_md)} chars | duration_s={t_agent4}"
        )

        # Build list of visited destinations preserving the user's ordered route sequence from Agent 1
        resolved_destinations = []
        agent1_dests = params.get("destinations", [])
        if isinstance(agent1_dests, list) and agent1_dests:
            for d in agent1_dests:
                canonical = next((c for c in KNOWN_LOCATIONS if c.lower() == str(d).lower()), str(d).title())
                if canonical not in resolved_destinations:
                    resolved_destinations.append(canonical)

        if not resolved_destinations and primary_destination:
            canonical = next((c for c in KNOWN_LOCATIONS if c.lower() == primary_destination.lower()), primary_destination)
            resolved_destinations.append(canonical)

        # Tag and resolve cities on curated hotels and POIs
        enriched_hotels = []
        for h in curated.get("hotels", []):
            h_copy = dict(h)
            lat, lng = h_copy.get("lat"), h_copy.get("lng")
            nearest = find_nearest_known_city(lat, lng)
            h_city = h_copy.get("city") or nearest or primary_destination
            h_copy["city"] = h_city
            if h_city and h_city in KNOWN_LOCATIONS and h_city not in resolved_destinations:
                resolved_destinations.append(h_city)
            enriched_hotels.append(h_copy)

        enriched_pois = []
        for p in curated.get("pois", []):
            p_copy = dict(p)
            lat, lng = p_copy.get("lat"), p_copy.get("lng")
            nearest = find_nearest_known_city(lat, lng)
            p_city = p_copy.get("city") or nearest or primary_destination
            p_copy["city"] = p_city
            if p_city and p_city in KNOWN_LOCATIONS and p_city not in resolved_destinations:
                resolved_destinations.append(p_city)
            enriched_pois.append(p_copy)

        if not resolved_destinations and primary_destination:
            resolved_destinations = [primary_destination]

        return {
            "itinerary": itinerary_md,
            "hotels": enriched_hotels,
            "pois": enriched_pois,
            "estimated_total_usd": curated["estimated_total_usd"],
            "budget_warning": curated["budget_warning"],
            "reasoning": curated["scoring_breakdown"],
            "agent_timings": timings,
            "destination": primary_destination,
            "destinations": resolved_destinations,
            "destination_coords": dest_coords,
            "params": params,
        }
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        return {"error": f"Pipeline failed: {str(e)}", "agent_timings": timings}


if __name__ == "__main__":
    import json
    prompt = (
        "Plan me a 5-day trip to Galle in December, family of 3, budget $450 total. "
        "We love beaches and historical sites. Want a clean hotel near Galle Fort, not too far from the beach."
    )
    result = run_agent_pipeline(prompt)
    print(f"\n{'='*60}")
    print(f"Agent Timings: {result.get('agent_timings')}")
    print(f"Budget Warning: {result.get('budget_warning')}")
    print(f"Estimated Total: ${result.get('estimated_total_usd')}")
    print(f"\n--- ITINERARY ---\n{result.get('itinerary', 'ERROR')[:1000]}...")
