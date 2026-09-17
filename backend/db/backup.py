"""Backup script for raw MongoDB scraping data.

Connects to webscrape_URI (webscrape_travel_raw_data) and exports all documents from:
- raw_hotels
- raw_places

Saves them as timestamped JSON files in /backend/backups/.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
from bson import json_util

# Ensure project root and backend dir are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

try:
    from backend.db.mongo_client import scraper_db, get_collection
except ImportError:
    from mongo_client import scraper_db, get_collection

# Target backup directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = BACKEND_DIR / "backups"


def backup_collection(collection_name: str, timestamp_str: str) -> Path:
    """Exports all documents from a given collection to a JSON file."""
    col = get_collection(scraper_db, collection_name)
    total_docs = col.count_documents({})

    filename = f"{collection_name}_backup_{timestamp_str}.json"
    file_path = BACKUP_DIR / filename

    print(f"[*] Starting backup for collection '{collection_name}' ({total_docs:,} documents)...")

    cursor = col.find({})
    docs_exported = 0

    with open(file_path, "w", encoding="utf-8") as f:
        f.write("[\n")
        first = True
        for doc in cursor:
            if not first:
                f.write(",\n")
            first = False
            # Serialize BSON documents (ObjectId, datetime, etc.) cleanly to JSON
            f.write("  " + json.dumps(doc, default=json_util.default))
            docs_exported += 1
        f.write("\n]\n")

    print(f"[SUCCESS] Exported {docs_exported:,} documents to: {file_path}")
    return file_path


def run_backup():
    """Executes the backup for raw_hotels and raw_places."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("=" * 60)
    print(f"RAW DATA BACKUP - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Source Database : {scraper_db.name}")
    print(f"Destination Dir : {BACKUP_DIR}")
    print("=" * 60)

    hotels_file = backup_collection("raw_hotels", timestamp_str)
    places_file = backup_collection("raw_places", timestamp_str)

    print("=" * 60)
    print("BACKUP SUMMARY:")
    print(f"1. Hotels backup : {hotels_file.name} (Size: {hotels_file.stat().st_size / (1024 * 1024):.2f} MB)")
    print(f"2. Places backup : {places_file.name} (Size: {places_file.stat().st_size / 1024:.2f} KB)")
    print("=" * 60)


if __name__ == "__main__":
    run_backup()
