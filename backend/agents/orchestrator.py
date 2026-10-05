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

        logger.info(
            f"Agent 1 complete | destination={params.get('destination')} | duration_s={t_agent1}"
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

        return {
            "itinerary": itinerary_md,
            "hotels": curated["hotels"],
            "pois": curated["pois"],
            "estimated_total_usd": curated["estimated_total_usd"],
            "budget_warning": curated["budget_warning"],
            "reasoning": curated["scoring_breakdown"],
            "agent_timings": timings,
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
