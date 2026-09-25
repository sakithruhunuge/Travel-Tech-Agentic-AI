"""Agent 4 — The Itinerary Explainer & Markdown Synthesis Agent.

Uses LangChain with the configured LLM to synthesize a personalized,
beautiful day-by-day Markdown itinerary from Agent 3's curated data
and Agent 1's user parameters.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()
