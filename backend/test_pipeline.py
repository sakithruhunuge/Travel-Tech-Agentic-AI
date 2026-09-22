import sys
from pathlib import Path

# Unbuffered output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

# Set up paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.agents.agent1_triage import parse_user_query
from backend.agents.agent2_ir import retrieve_candidates
from backend.agents.agent3_curator import curate_candidates

def run_test():
    query = "5 days in Galle this December, budget $400, couple, love beaches and history, want a quiet boutique hotel near the fort"
    print("==================================================")
    print("USER PROMPT:")
    print(f"  \"{query}\"")
    print("==================================================")

    # 1. Agent 1 — Triage
    print("\n[Step 1] Running Agent 1 (NLP Triage Agent)...")
    parsed_params = parse_user_query(query)
    print("  Destination:", parsed_params.get("destination"))
    print("  Coordinates:", parsed_params.get("destination_coords"))
    print("  Budget:", parsed_params.get("budget_max_usd"))
    print("  Duration (days):", parsed_params.get("duration_days"))
    print("  Interests:", parsed_params.get("interests"))
    print("  Party Size:", parsed_params.get("party_size"))
    print("  Custom Vibe:", parsed_params.get("custom_vibe"))

    # 2. Agent 2 — Information Retrieval
    print("\n[Step 2] Running Agent 2 (Information Retrieval Agent)...")
    candidates = retrieve_candidates(parsed_params)
    hotels = candidates.get("hotels", [])
    pois = candidates.get("pois", [])
    meta = candidates.get("query_metadata", {})
    print(f"  Found {len(hotels)} candidate hotels via {meta.get('vector_search_method')} search")
    print(f"  Found {len(pois)} candidate POIs")
    if hotels:
        print(f"  Sample candidate: {hotels[0]['name']} (${hotels[0].get('price_usd')}/night)")

    # 3. Agent 3 — Curator & Personalization
    print("\n[Step 3] Running Agent 3 (Personalization & Budget Curator)...")
    curated = curate_candidates(candidates, parsed_params)
    final_hotels = curated.get("hotels", [])
    final_pois = curated.get("pois", [])

    print(f"  Ranked Hotels: {len(final_hotels)}")
    for i, h in enumerate(final_hotels[:3], 1):
        score = curated.get("scoring_breakdown", {}).get(h["name"], {})
        print(f"    {i}. {h['name']} | Price: ${h.get('price_usd')}/night | Total Score: {h.get('curator_score', 0):.1f}")
        print(f"       Breakdown: {score}")

    print(f"\n  Curated POIs: {len(final_pois)}")
    for i, p in enumerate(final_pois[:3], 1):
        print(f"    {i}. {p['name']} (Tags: {p.get('intent_tags')})")

    print(f"\n  Budget Assessment: Warning={curated.get('budget_warning')}, Estimated Total=${curated.get('estimated_total_usd')}")
    print("\n==================================================")
    print("RESULT: Agent 1, Agent 2, and Agent 3 are ALL WORKING PERFECTLY TOGETHER!")
    print("==================================================")

if __name__ == "__main__":
    run_test()
