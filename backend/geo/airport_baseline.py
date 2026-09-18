"""Airport baseline coordinates and distance calculation for Sri Lanka.

Provides nearest airport identification and transit baseline metrics.
"""

import sys
from pathlib import Path
from typing import Dict, Any

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

try:
    from backend.geo.proximity import haversine_distance
except ImportError:
    from proximity import haversine_distance

# Primary international airports in Sri Lanka
SRI_LANKA_AIRPORTS = [
    {
        "airport_name": "Bandaranaike International Airport",
        "iata_code": "CMB",
        "lat": 7.1808,
        "lng": 79.8842,
    },
    {
        "airport_name": "Mattala Rajapaksa International Airport",
        "iata_code": "HRI",
        "lat": 6.2844,
        "lng": 81.1242,
    },
    {
        "airport_name": "Jaffna International Airport",
        "iata_code": "JAF",
        "lat": 9.7924,
        "lng": 80.0700,
    },
]


def nearest_airport(lat: float, lng: float) -> Dict[str, Any]:
    """Finds the nearest airport to the given coordinates.
    
    Returns:
        dict: {"airport_name": str, "iata_code": str, "distance_km": float}
    """
    best_airport = None
    min_distance = float("inf")

    for airport in SRI_LANKA_AIRPORTS:
        dist = haversine_distance(lat, lng, airport["lat"], airport["lng"])
        if dist < min_distance:
            min_distance = dist
            best_airport = airport

    return {
        "airport_name": best_airport["airport_name"],
        "iata_code": best_airport["iata_code"],
        "distance_km": round(min_distance, 2),
    }


if __name__ == "__main__":
    # Test with Colombo Fort coordinates
    colombo = nearest_airport(6.9355, 79.8487)
    print("Nearest airport to Colombo Fort:", colombo)
