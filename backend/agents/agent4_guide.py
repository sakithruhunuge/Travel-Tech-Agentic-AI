"""Agent 4 — The Itinerary Explainer & Markdown Synthesis Agent.

Uses LangChain with the configured LLM (Gemini, OpenAI, or Ollama) to synthesize
a personalized, beautiful day-by-day Markdown itinerary from Agent 3's curated data
and Agent 1's user parameters.
"""

import os
from pathlib import Path
from typing import Any, Dict
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SYSTEM_PROMPT = """You are an expert, warm, and knowledgeable Sri Lanka travel guide AI.
You create beautiful, detailed, day-by-day itineraries in Markdown format.

You receive:
1. A curated shortlist of hotels and POIs (with scores and metadata)
2. The user's original travel parameters

Your output MUST follow this exact Markdown structure:

# 🌴 Your Sri Lanka Itinerary: [Destination] ([N] Days)

## Overview
[2-3 sentence warm introduction mentioning destination, travel style, and budget]

---

## Day 1: [Theme Title]
**🌅 Morning:** [Activity + why it suits the user's vibe]
**☀️ Afternoon:** [Activity + estimated time + travel tip]
**🌙 Evening:** [Activity or dinner recommendation]
**🏨 Tonight's Stay:** [Hotel name] — [1 sentence: why this hotel specifically matches their budget and preferences]
**💰 Estimated Day Cost:** ~$[X] per person

[Repeat for each day...]

---

## 💡 Why These Recommendations?
[For each recommended hotel and top 3 POIs, write 2 sentences explaining WHY it was chosen.
Reference specific user preferences, budget fit, and proximity reasoning.]

## 💰 Budget Breakdown
| Item | Estimated Cost |
|------|---------------|
| Accommodation ([N] nights) | $[X] |
| Entry fees & activities | $[X] |
| Airport transfers | $15 |
| **Estimated Total** | **$[X]** |

> ⚠️ [Only if budget_warning is True]: "Note: Your selected destination and dates may be slightly 
> over budget. Consider [specific suggestion]."

Write in a warm, first-person guide tone. Be specific — use actual hotel names and POI names 
from the data provided. Never make up places not in the provided list."""


def get_llm():
    """Retrieve the configured LLM matching Agent 1's provider order."""
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if google_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            temperature=0.3,
            api_key=google_api_key,
        )
    elif openai_api_key:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.3,
            api_key=openai_api_key,
        )
    else:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "qwen3:8b"),
            temperature=0.3,
        )


def _build_user_message(curated_data: Dict[str, Any], user_params: Dict[str, Any]) -> str:
    """Build a structured and readable prompt for the synthesis LLM."""
    # a) user_params as a readable summary
    destination = user_params.get("destination", "Sri Lanka")
    duration_days = user_params.get("duration_days") or user_params.get("duration", 1)
    travel_dates = user_params.get("travel_dates", "Flexible / Upcoming")
    budget_usd = user_params.get("budget_max_usd") or user_params.get("budget", "Flexible")
    party_size = user_params.get("party_size") or user_params.get("travellers", 2)
    interests = user_params.get("interests", [])
    if isinstance(interests, list):
        interests_str = ", ".join(interests) if interests else "Sightseeing & Culture"
    else:
        interests_str = str(interests)
    custom_vibe = user_params.get("custom_vibe", "Authentic, relaxing, and memorable")

    user_summary = (
        f"USER TRAVEL PARAMETERS:\n"
        f"- Destination: {destination}\n"
        f"- Duration: {duration_days} Day(s)\n"
        f"- Travel Dates: {travel_dates}\n"
        f"- Total Budget: ${budget_usd}\n"
        f"- Party Size: {party_size} traveler(s)\n"
        f"- Preferred Interests: {interests_str}\n"
        f"- Travel Vibe & Preferences: {custom_vibe}\n"
    )

    # b) curated_data["hotels"] (top 3) formatted as a numbered list with key fields
    hotels = curated_data.get("hotels", [])[:3]
    hotel_lines = []
    for idx, h in enumerate(hotels, 1):
        name = h.get("name", f"Hotel #{idx}")
        price = h.get("price_usd", "N/A")
        tier = h.get("price_tier", "Standard")
        stars = h.get("star_rating", "Unrated")
        score = h.get("curator_score", "N/A")
        
        amenities = []
        if h.get("has_wifi"):
            amenities.append("Free WiFi")
        if h.get("has_pool"):
            amenities.append("Swimming Pool")
        if h.get("has_restaurant"):
            amenities.append("In-house Restaurant")
        amenities_str = ", ".join(amenities) if amenities else "Standard amenities"

        dist_str = ""
        if "dist_meters" in h:
            dist_km = round(h["dist_meters"] / 1000, 1)
            dist_str = f" | Distance: {dist_km} km"

        hotel_lines.append(
            f"{idx}. {name} — Price: ${price}/night ({tier}) | Rating: {stars} | Amenities: {amenities_str}{dist_str} | Match Score: {score}"
        )
    hotels_summary = "TOP RECOMMENDED HOTELS:\n" + ("\n".join(hotel_lines) if hotel_lines else "None provided")

    # c) curated_data["pois"] (top 10) formatted as a numbered list with name, intent_tags, popularity_index
    pois = curated_data.get("pois", [])[:10]
    poi_lines = []
    for idx, p in enumerate(pois, 1):
        name = p.get("name", f"Attraction #{idx}")
        tags = p.get("intent_tags", [])
        tags_str = ", ".join(tags) if isinstance(tags, list) else str(tags)
        pop = p.get("popularity_index", "N/A")
        score = p.get("curator_score", "")
        score_info = f" | Curator Score: {score}" if score != "" else ""
        poi_lines.append(f"{idx}. {name} — Intent Tags: [{tags_str}] | Popularity Index: {pop}{score_info}")
    pois_summary = "TOP CURATED POINTS OF INTEREST (POIs):\n" + ("\n".join(poi_lines) if poi_lines else "None provided")

    # d) budget_warning flag and estimated_total_usd
    budget_warning = curated_data.get("budget_warning", False)
    estimated_total_usd = curated_data.get("estimated_total_usd", 0.0)

    # Calculate accommodation subtotal estimation for reference
    cheapest_nightly = 0.0
    if hotels:
        valid_rates = [float(h.get("price_usd", 0)) for h in hotels if float(h.get("price_usd", 0)) > 0]
        if valid_rates:
            cheapest_nightly = min(valid_rates)
    approx_stay_cost = round(cheapest_nightly * duration_days, 2)
    approx_activity_cost = round(len(pois) * 5.0, 2)

    cost_summary = (
        f"BUDGET & FEASIBILITY CONTEXT:\n"
        f"- Budget Warning: {budget_warning}\n"
        f"- Target Budget: ${budget_usd}\n"
        f"- Estimated Trip Total: ${estimated_total_usd}\n"
        f"- Duration: {duration_days} nights\n"
        f"- Estimated Accommodation Total: ~${approx_stay_cost}\n"
        f"- Estimated Activities Total: ~${approx_activity_cost}\n"
        f"- Airport Transfers: $15\n"
    )

    return f"{user_summary}\n{hotels_summary}\n\n{pois_summary}\n\n{cost_summary}"


def generate_itinerary(curated_data: dict, user_params: dict) -> str:
    """Generate a synthesized Markdown travel itinerary using LangChain and LLM."""
    from langchain_core.messages import SystemMessage
    from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    user_message = _build_user_message(curated_data, user_params)

    prompt_template = ChatPromptTemplate.from_messages([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template("{input}")
    ])

    llm = get_llm()
    chain = prompt_template | llm | StrOutputParser()

    result = chain.invoke({"input": user_message})
    return str(result).strip()


if __name__ == "__main__":
    # Self-test mock execution
    mock_user_params = {
        "destination": "Galle",
        "travel_dates": "December 10-15 2026",
        "duration_days": 5,
        "budget_max_usd": 400.0,
        "party_size": 2,
        "interests": ["Historical", "Beach"],
        "custom_vibe": "quiet boutique hotel near the fort",
    }
    mock_curated = {
        "hotels": [
            {
                "name": "Galle Fort Hotel",
                "price_usd": 85.0,
                "price_tier": "Standard",
                "star_rating": "4 stars",
                "has_wifi": 1,
                "has_pool": 0,
                "has_restaurant": 1,
                "dist_meters": 500,
                "curator_score": 82.5,
            },
            {
                "name": "Budget Inn Unawatuna",
                "price_usd": 35.0,
                "price_tier": "Budget",
                "star_rating": "Unrated",
                "has_wifi": 1,
                "has_pool": 0,
                "has_restaurant": 0,
                "dist_meters": 3000,
                "curator_score": 75.0,
            },
        ],
        "pois": [
            {"name": "Galle Fort", "intent_tags": ["Historical", "Urban"], "popularity_index": 0.95, "curator_score": 90.0},
            {"name": "Unawatuna Beach", "intent_tags": ["Beach", "Nature"], "popularity_index": 0.88, "curator_score": 85.0},
            {"name": "Jungle Beach", "intent_tags": ["Beach", "Adventure"], "popularity_index": 0.62, "curator_score": 72.0},
        ],
        "budget_warning": False,
        "estimated_total_usd": 375.0,
        "scoring_breakdown": {
            "Galle Fort Hotel": {"budget_fit": 23.6, "amenity": 15.0, "rating": 12.0, "density": 16.0, "proximity": 15.9, "total": 82.5}
        },
    }

    print("Testing generate_itinerary...")
    md = generate_itinerary(mock_curated, mock_user_params)
    print(md[:500] + "...")
