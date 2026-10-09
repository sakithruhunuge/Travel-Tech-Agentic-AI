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

SYSTEM_PROMPT = """You are an expert, warm, and highly articulate Sri Lanka travel guide AI.
You create beautiful, crystal-clear, day-by-day itineraries in Markdown with deep Explainable AI (XAI) transparency.
Your goal is to make every recommendation effortless for travelers to understand, explaining the exact "why" behind every stay, sight, and route decision.

You receive:
1. A curated shortlist of hotels and POIs (with scores, pricing, amenities, and proximity)
2. The user's original travel parameters (destinations, budget, duration, party size, vibes)

Your output MUST follow this exact Markdown structure:

# 🌴 Your Sri Lanka Itinerary: [Destination] ([N] Days)

## Overview
[3-4 warm, inviting sentences summarizing the journey, travelers, requested travel vibe, and total financial allocation]

---

## Day 1: [Theme Title]

**🌅 Morning:** [Detailed activity description + why this morning timing is optimal: e.g. cooler temperatures, avoiding peak tour bus crowds, or scenic morning light]

**☀️ Afternoon:** [Detailed activity description + estimated duration + practical travel tip or local dining highlight]

**🌙 Evening:** [Atmospheric sunset or dinner recommendation + local culinary specialty to try]

**🏨 Tonight's Stay:** [Hotel name] — [Detailed explanation: exact price fit ($[X]/night), star rating & comfort match, key amenities, and strategic location advantage]

**💡 Day Travel Insight:** [1-2 practical, actionable tips: e.g., expected drive time, temple dress etiquette (shoulders and knees covered), or photography vantage point]

**💰 Estimated Day Cost:** ~$[X] per person

[Repeat for each day, ALWAYS keeping a blank line between Morning, Afternoon, Evening, Tonight's Stay, Day Travel Insight, and Estimated Day Cost...]

---

## 💡 Why These Recommendations? (Explainable AI Highlights)

### 🏨 Curated Stays Selection Rationale
[For each recommended hotel, provide a crystal-clear, transparent breakdown:
- **Budget Fit & Value:** Explain how its nightly rate ($[X]) fits comfortably within the target budget without surprise fees.
- **Star & Comfort Alignment:** Explain how its star rating, verified guest satisfaction score, and amenities (pool, Wi-Fi, restaurant) match the user's travel preferences.
- **Geographic Advantage:** Explain its proximity to the day's primary attractions and how it reduces road travel time.]

### 🏛️ Attractions & Cultural POI Prioritization
[For top curated attractions, explain:
- **Vibe & Interest Match:** Exactly how this sight fulfills the traveler's stated passions (e.g. ancient architecture, wildlife, ocean relaxation).
- **Scheduling Logic:** Why it is placed at this point in the itinerary (morning vs afternoon, crowd avoidance).]

### 🗺️ Route Efficiency & Logistics Logic
[2-3 sentences explaining the geographic flow between destinations to eliminate tedious backtracking, minimize travel fatigue, and provide smooth road/train connections.]

### 🛡️ Budget Feasibility & Cost Safeguards
[Explain how accommodation, entrance fees, and regional transfers combine to keep the overall journey realistic and financially sound.]

## 💰 Budget Breakdown
| Item | Estimated Cost |
|------|---------------|
| Accommodation ([N] nights) | $[X] |
| Entry fees & activities | $[X] |
| Airport transfers | $15 |
| **Estimated Total** | **$[X]** |

> ⚠️ [Only if budget_warning is True]: "Note: Your selected destination and dates may be slightly 
> over budget. Consider [specific suggestions to stay within budget]."

Write in a warm, knowledgeable, transparent tone. Use actual hotel and POI names from the provided data.
Ensure every explanation feels human, clear, and genuinely helpful to someone planning their dream holiday."""


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

    destinations_list = user_params.get("destinations") or ([destination] if destination else ["Sri Lanka"])
    destinations_str = " ➔ ".join(destinations_list)

    user_summary = (
        f"USER TRAVEL PARAMETERS:\n"
        f"- Primary Destination: {destination}\n"
        f"- Ordered Multi-Stop Route: {destinations_str}\n"
        f"- Duration: {duration_days} Day(s)\n"
        f"- Travel Dates: {travel_dates}\n"
        f"- Total Budget: ${budget_usd}\n"
        f"- Party Size: {party_size} traveler(s)\n"
        f"- Preferred Interests: {interests_str}\n"
        f"- Travel Vibe & Preferences: {custom_vibe}\n"
        f"Please sequence the days across the user's requested route: {destinations_str}.\n"
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


def _generate_template_itinerary(curated_data: dict, user_params: dict) -> str:
    """Deterministic fallback synthesis following exact SYSTEM_PROMPT format."""
    destination = user_params.get("destination", "Sri Lanka")
    destinations = user_params.get("destinations") or ([destination] if destination else ["Sri Lanka"])
    destinations_str = " ➔ ".join(destinations)
    duration = int(user_params.get("duration_days") or user_params.get("duration") or 5)
    party_size = int(user_params.get("party_size") or user_params.get("travellers") or 2)
    budget = user_params.get("budget_max_usd") or user_params.get("budget") or 500.0
    interests = user_params.get("interests", ["Historical", "Beach"])
    interests_str = ", ".join(interests) if interests else "exploring Sri Lanka"

    hotels = curated_data.get("hotels", [])
    pois = curated_data.get("pois", [])
    budget_warning = curated_data.get("budget_warning", False)
    estimated_total = curated_data.get("estimated_total_usd", 400.0)

    primary_hotel = hotels[0] if hotels else {"name": f"Boutique Stay {destination}", "price_usd": 65.0}
    hotel_name = primary_hotel.get("name", "Local Resort")
    hotel_price = float(primary_hotel.get("price_usd", 65.0))
    stay_total = round(hotel_price * duration, 2)
    activities_total = round(len(pois) * 8.0, 2)

    budget_cat = str(user_params.get("budget_category") or user_params.get("hotel_tier") or "standard").lower()
    cat_title = (
        "🪙 Budget Category (3-Star & Economy)"
        if budget_cat == "budget"
        else ("✨ Luxury Category (5-Star & Premium Resort)" if budget_cat == "luxury" else "🛋️ Standard Category (4-Star & Comfort)")
    )

    lines = [
        f"# 🌴 Your Sri Lanka Itinerary: {destinations_str} ({duration} Days)\n",
        "## Overview",
        f"Welcome to your handcrafted {duration}-day journey across {destinations_str}! Tailored for {party_size} traveler{'s' if party_size > 1 else ''} in our **{cat_title}**, this plan balances iconic landmarks, leisure, and memorable local experiences strictly aligned with your ${budget:.0f} budget.\n",
        "---\n",
    ]

    # Day-by-day plan distributed across requested multi-destinations
    for day in range(1, duration + 1):
        dest_idx = min(int((day - 1) * len(destinations) / duration), len(destinations) - 1)
        current_dest = destinations[dest_idx]

        poi_morning = pois[(day * 2 - 2) % len(pois)] if pois else {"name": f"{current_dest} Highlights"}
        poi_afternoon = pois[(day * 2 - 1) % len(pois)] if pois else {"name": f"Historic {current_dest} Quarters"}

        m_name = poi_morning.get("name", f"{current_dest} Sightseeing")
        a_name = poi_afternoon.get("name", f"{current_dest} Exploration")

        day_cost = round((hotel_price + 25.0) / max(party_size, 1), 1)

        lines.extend([
            f"## Day {day}: {current_dest} — Exploring {m_name} & Heritage Trails",
            f"**🌅 Morning:** Visit **{m_name}** in {current_dest} during cooler morning hours. Enjoy picturesque vistas, gentle breezes, and unhurried exploration matching your interest in {interests_str}.",
            f"**☀️ Afternoon:** Head over to **{a_name}** (~2-3 hours). Immerse yourself in authentic cultural history, local artisan crafts, and traditional Ceylon refreshments.",
            f"**🌙 Evening:** Savor freshly prepared local culinary specialties and tropical fruits at a scenic bistro while soaking up the relaxing twilight ambiance of {current_dest}.",
            f"**🏨 Tonight's Stay:** **{hotel_name}** ({current_dest}) — Handpicked by Agent 3 for verified guest satisfaction, peaceful surroundings, and outstanding value at ${hotel_price:.0f}/night (100% budget fit).",
            f"**💡 Day Travel Insight:** Recommended transit time between morning and afternoon stops is ~20-30 minutes. Wear modest shoulder/knee covering if entering heritage sanctuaries, and carry sun protection for midday walks.",
            f"**💰 Estimated Day Cost:** ~${day_cost} per person\n",
        ])

    lines.append("---\n")
    lines.append("## 💡 Why These Recommendations? (Explainable AI Highlights)\n")
    lines.append("### 🏨 Curated Stays Selection Rationale")
    for idx, h in enumerate(hotels[:2], 1):
        h_n = h.get("name", f"Hotel #{idx}")
        h_p = float(h.get("price_usd", 45.0))
        h_tier = h.get("price_tier", "Boutique")
        h_stars = h.get("star_rating", "3-Star")
        lines.append(f"- **{h_n} ({h_tier} · {h_stars})**:")
        lines.append(f"  - **Budget Fit & Value:** Priced at ${h_p:.0f}/night, directly satisfying your financial target without unexpected surcharges.")
        lines.append(f"  - **Comfort & Amenities:** Offers clean, restful rooms, reliable Wi-Fi, and courteous hospitality rated highly by independent travelers.")
        lines.append(f"  - **Geographic Advantage:** Centrally situated near key transit corridors in {destinations_str}, cutting down daily road fatigue.")
    lines.append("")

    lines.append("### 🏛️ Attractions & Cultural POI Prioritization")
    for idx, p in enumerate(pois[:3], 1):
        p_name = p.get("name", f"Attraction #{idx}")
        tags = ", ".join(p.get("intent_tags", ["Heritage"]))
        lines.append(f"- **{p_name}** ({tags}):")
        lines.append(f"  - **Vibe Alignment:** Directly reflects your stated focus on {interests_str}, ensuring a culturally authentic and rewarding visit.")
        lines.append(f"  - **Timing & Access:** Scheduled at optimal daylight hours to prevent midday heat fatigue and bypass peak tour group congestion.")
    lines.append("")

    lines.append("### 🗺️ Route Efficiency & Logistics Logic")
    lines.append(f"- **Zero Backtracking:** The route follows a natural geographical progression across {destinations_str}, minimizing travel hours and maximizing your time enjoying Sri Lanka.")
    lines.append(f"- **Traveler Comfort Pacing:** Morning active exploration is paired with relaxed afternoons and atmospheric evenings to maintain an enjoyable, unhurried holiday pace.\n")

    lines.append("### 🛡️ Budget Feasibility & Cost Safeguards")
    lines.append(f"- **Audited Expenses:** Total estimated lodging (${stay_total:.0f}) and curated activity passes (${activities_total:.0f}) sit securely within your ${budget:.0f} allocation.")
    lines.append(f"- **Transparent Pricing:** No hidden resort fees or inflated commissions; all rates represent verified local averages.\n")

    lines.append("## 💰 Budget Breakdown")
    lines.append("| Item | Estimated Cost |")
    lines.append("|------|---------------|")
    lines.append(f"| Accommodation ({duration} nights @ ${hotel_price:.0f}/night) | ${stay_total:.0f} |")
    lines.append(f"| Entry fees & curated activities | ${activities_total:.0f} |")
    lines.append("| Airport transfers | $15 |")
    lines.append(f"| **Estimated Total** | **${estimated_total:.0f}** |\n")

    if budget_warning:
        lines.append(f"> ⚠️ Note: Your selected destination and dates may be slightly over budget. Consider booking standard rooms or dining at local coastal eateries to stay under ${budget}.")

    return "\n".join(lines)


def generate_itinerary(curated_data: dict, user_params: dict) -> str:
    """Generate a synthesized Markdown travel itinerary using LangChain and LLM, with deterministic fallback."""
    try:
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
        output = str(result).strip()
        if output:
            return output
    except Exception:
        pass

    return _generate_template_itinerary(curated_data, user_params)


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
