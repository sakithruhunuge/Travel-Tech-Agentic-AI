"""Agents package containing Agent 1 (Intake), Agent 2 (Retrieval), Agent 3 (Evaluator/Ranking), and Agent 4 (Synthesis/XAI)."""

from backend.agents.agent3_curator import (
    curate_candidates,
    score_hotel,
    score_poi,
)

try:
    from backend.agents.agent2_ir import retrieve_candidates
except ImportError:
    retrieve_candidates = None

try:
    from backend.agents.agent1_triage import parse_user_query
except ImportError:
    parse_user_query = None

try:
    from backend.agents.agent4_guide import generate_itinerary
except ImportError:
    generate_itinerary = None

try:
    from backend.agents.orchestrator import run_agent_pipeline
except ImportError:
    run_agent_pipeline = None

__all__ = [
    "parse_user_query",
    "curate_candidates",
    "score_hotel",
    "score_poi",
    "retrieve_candidates",
    "generate_itinerary",
    "run_agent_pipeline",
]
