import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.agents.agent1_triage import parse_user_query
from backend.agents.agent2_ir import retrieve_candidates
from backend.agents.agent3_curator import curate_candidates

def run_test():
    query = "5 days in Galle this December, budget $400, couple, love beaches and history, want a quiet boutique hotel near the fort"
    print("USER PROMPT:", query)
    parsed_params = parse_user_query(query)
    candidates = retrieve_candidates(parsed_params)
    curated = curate_candidates(candidates, parsed_params)
    print("Curated Hotels:", len(curated.get("hotels", [])))
    print("Curated POIs:", len(curated.get("pois", [])))

if __name__ == "__main__":
    run_test()
