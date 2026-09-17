"""Index setup script for travel_staging MongoDB database.

Creates:
1. 2dsphere geospatial indexes on 'location' for geospatial $geoNear and $near queries.
2. Filter indexes on 'embedding_ready', 'price_tier', 'price_usd', 'intent_tags', and 'popularity_index'.
3. Prints Atlas Vector Search index configuration and step-by-step instructions.
"""

import sys
import json
from pathlib import Path
from pymongo import ASCENDING, GEOSPHERE

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

try:
    from backend.db.mongo_client import main_db
except ImportError:
    from mongo_client import main_db


def setup_indexes():
    """Sets up standard and 2dsphere indexes on staged_hotels and staged_places."""
    staging_db = main_db.client["travel_staging"]
    hotels_col = staging_db["staged_hotels"]
    places_col = staging_db["staged_places"]

    print("=" * 70)
    print("MONGODB INDEX SETUP - TRAVEL_STAGING DATABASE")
    print(f"Cluster: {main_db.name} | Database: {staging_db.name}")
    print("=" * 70)

    # 1. Staged Hotels Indexes
    print("\n[*] Creating indexes on 'staged_hotels'...")
    h_idx1 = hotels_col.create_index([("location", GEOSPHERE)], name="location_2dsphere")
    print(f"  [+] 2dsphere index: {h_idx1}")

    h_idx2 = hotels_col.create_index([("embedding_ready", ASCENDING)], name="embedding_ready_1")
    print(f"  [+] Filter index: {h_idx2}")

    h_idx3 = hotels_col.create_index([("price_tier", ASCENDING)], name="price_tier_1")
    print(f"  [+] Filter index: {h_idx3}")

    h_idx4 = hotels_col.create_index([("price_usd", ASCENDING)], name="price_usd_1")
    print(f"  [+] Range index: {h_idx4}")

    # 2. Staged Places Indexes
    print("\n[*] Creating indexes on 'staged_places'...")
    p_idx1 = places_col.create_index([("location", GEOSPHERE)], name="location_2dsphere")
    print(f"  [+] 2dsphere index: {p_idx1}")

    p_idx2 = places_col.create_index([("embedding_ready", ASCENDING)], name="embedding_ready_1")
    print(f"  [+] Filter index: {p_idx2}")

    p_idx3 = places_col.create_index([("intent_tags", ASCENDING)], name="intent_tags_1")
    print(f"  [+] Multi-key index: {p_idx3}")

    p_idx4 = places_col.create_index([("popularity_index", ASCENDING)], name="popularity_index_1")
    print(f"  [+] Range index: {p_idx4}")

    # List confirmed indexes
    print("\n" + "=" * 70)
    print("CONFIRMED MONGODB INDEXES:")
    print("-" * 70)
    print("staged_hotels indexes:")
    for idx in hotels_col.list_indexes():
        print(f"  - {idx['name']}: {idx['key']}")

    print("\nstaged_places indexes:")
    for idx in places_col.list_indexes():
        print(f"  - {idx['name']}: {idx['key']}")

    # Atlas Vector Search Configuration Instructions
    vector_search_config = {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": 384,
                "similarity": "cosine",
            }
        ]
    }

    print("\n" + "=" * 70)
    print("ATLAS VECTOR SEARCH CONFIGURATION")
    print("=" * 70)
    print(
        "Atlas Vector Search indexes must be configured in MongoDB Atlas UI or CLI.\n"
    )
    print("JSON Index Configuration (for both staged_hotels and staged_places):")
    print(json.dumps(vector_search_config, indent=2))

    print("\n--- STEP-BY-STEP ATLAS UI INSTRUCTIONS ---")
    print("1. Log in to MongoDB Atlas (https://cloud.mongodb.com)")
    print("2. Navigate to your Database Deployment -> Click 'Search' tab.")
    print("3. Click 'Create Search Index' -> Select 'JSON Editor'.")
    print("4. For Hotels Vector Index:")
    print("   - Database: travel_staging")
    print("   - Collection: staged_hotels")
    print("   - Index Name: hotel_vector_index")
    print("   - Paste the JSON configuration above -> Click 'Create Search Index'.")
    print("5. For POIs Vector Index:")
    print("   - Click 'Create Search Index' -> Select 'JSON Editor'.")
    print("   - Database: travel_staging")
    print("   - Collection: staged_places")
    print("   - Index Name: poi_vector_index")
    print("   - Paste the JSON configuration above -> Click 'Create Search Index'.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    setup_indexes()
