"""Staging setup script for the Travel-Tech pipeline.

Uses the main_db client (production cluster) to create/ensure a staging database
called 'travel_staging' with empty collections:
- staged_hotels
- staged_places
"""

import os
import sys
from pathlib import Path

# Ensure project root and backend dir are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

from pymongo.database import Database
try:
    from backend.db.mongo_client import main_db
except ImportError:
    from mongo_client import main_db


def setup_staging_database(reset: bool = False) -> Database:
    """Sets up the 'travel_staging' database with empty staged collections."""
    client = main_db.client
    staging_db = client["travel_staging"]

    target_collections = ["staged_hotels", "staged_places"]
    existing_collections = staging_db.list_collection_names()

    print("=" * 60)
    print("STAGING DATABASE SETUP")
    print(f"Target Cluster  : {main_db.name} cluster ({client.address})")
    print(f"Staging Database: {staging_db.name}")
    print("=" * 60)

    for coll_name in target_collections:
        if coll_name in existing_collections:
            if reset:
                staging_db.drop_collection(coll_name)
                staging_db.create_collection(coll_name)
                print(f"[RESET] Dropped and recreated empty collection: '{coll_name}'")
            else:
                doc_count = staging_db[coll_name].count_documents({})
                print(f"[EXISTS] Collection '{coll_name}' already exists ({doc_count} documents).")
        else:
            staging_db.create_collection(coll_name)
            print(f"[CREATED] Successfully created empty collection: '{coll_name}'")

    print("=" * 60)
    print("[CONFIRMATION] 'travel_staging' database is ready.")
    print(f"Active Collections in 'travel_staging': {staging_db.list_collection_names()}")
    print("=" * 60)

    return staging_db


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    setup_staging_database(reset=reset_flag)
