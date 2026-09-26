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
