"""Proximity and geospatial utility functions for travel tech platform.

Calculates Haversine distances, radius checks, and POI density metrics.
"""

import math
from typing import Dict, List, Any


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates great-circle distance between two points in KILOMETERS.
    
    Uses Earth radius R = 6371.0 km.
    """
    R = 6371.0  # Earth radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def is_within_radius(
    hotel_lat: float,
    hotel_lng: float,
    poi_lat: float,
    poi_lng: float,
    radius_km: float = 5.0,
) -> bool:
    """Determines whether a POI is within radius_km of a hotel."""
    # Fast bounding box pre-filter (~1 deg lat ≈ 111 km)
    lat_diff = abs(hotel_lat - poi_lat)
    if lat_diff * 111.0 > radius_km:
        return False

    return haversine_distance(hotel_lat, hotel_lng, poi_lat, poi_lng) <= radius_km


def get_nearby_pois(
    hotel: Dict[str, Any],
    all_pois: List[Dict[str, Any]],
    radius_km: float = 5.0,
) -> List[str]:
    """Returns a list of POI names located within radius_km of the hotel."""
    h_lat = float(hotel["lat"])
    h_lng = float(hotel["lng"])

    nearby_names = []
    for poi in all_pois:
        p_lat = float(poi["lat"])
        p_lng = float(poi["lng"])
        if is_within_radius(h_lat, h_lng, p_lat, p_lng, radius_km):
            nearby_names.append(poi.get("name", "Unknown POI"))

    return nearby_names


def calculate_poi_density(
    hotel: Dict[str, Any],
    all_pois: List[Dict[str, Any]],
    radius_km: float = 5.0,
) -> int:
    """Returns the count of POIs within radius_km of the hotel."""
    h_lat = float(hotel["lat"])
    h_lng = float(hotel["lng"])

    count = 0
    for poi in all_pois:
        p_lat = float(poi["lat"])
        p_lng = float(poi["lng"])
        if is_within_radius(h_lat, h_lng, p_lat, p_lng, radius_km):
            count += 1

    return count
