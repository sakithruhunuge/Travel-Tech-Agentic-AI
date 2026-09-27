"""Full 4-Agent Orchestrator Pipeline for Sri Lanka Travel Agentic AI.

Coordinates the end-to-end execution of:
1. Agent 1: NLP Triage (intent extraction & safety checks)
2. Agent 2: Information Retrieval (geospatial MongoDB & vector search)
3. Agent 3: Personalization & Feasibility Curator (deterministic scoring & budget fit)
4. Agent 4: Itinerary Explainer & Synthesizer (Markdown day-by-day generation)
"""

import sys
import time
from pathlib import Path
from typing import Any, Dict

# Ensure project root is accessible for absolute imports
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from backend.agents import agent1_triage, agent2_ir, agent3_curator, agent4_guide
except (ImportError, ModuleNotFoundError):
    import agent1_triage
    import agent2_ir
    import agent3_curator
    import agent4_guide


def run_agent_pipeline(raw_user_prompt: str) -> dict:
    """Executes the full 4-agent pipeline sequentially and captures execution timings."""
    timings = {}

    # Agent 1: NLP Triage
    t0 = time.time()
    params = agent1_triage.parse_user_query(raw_user_prompt)
    timings["agent1_triage_s"] = round(time.time() - t0, 2)

    if "error" in params:
        return {"error": params["error"], "agent_timings": timings}

    # Agent 2: Information Retrieval
    t0 = time.time()
    candidates = agent2_ir.retrieve_candidates(params)
    timings["agent2_ir_s"] = round(time.time() - t0, 2)

    # Agent 3: Personalization & Curation
    t0 = time.time()
    curated = agent3_curator.curate_candidates(candidates, params)
    timings["agent3_curator_s"] = round(time.time() - t0, 2)

    # Agent 4: Itinerary Generation
    t0 = time.time()
    itinerary_md = agent4_guide.generate_itinerary(curated, params)
    timings["agent4_guide_s"] = round(time.time() - t0, 2)

    return {
        "itinerary": itinerary_md,
        "hotels": curated["hotels"],
        "pois": curated["pois"],
        "estimated_total_usd": curated["estimated_total_usd"],
        "budget_warning": curated["budget_warning"],
        "reasoning": curated["scoring_breakdown"],
        "agent_timings": timings,
    }


if __name__ == "__main__":
    test_query = (
        "5 days in Galle this December, budget $400, couple, love beaches and history, "
        "want a quiet boutique hotel near the fort"
    )
    print("Executing full 4-agent pipeline test...")
    result = run_agent_pipeline(test_query)
    print("Pipeline result keys:", list(result.keys()))
    print("Timings:", result.get("agent_timings"))
    if "itinerary" in result:
        print("\n--- Generated Itinerary Preview ---\n")
        print(result["itinerary"][:400] + "...")
