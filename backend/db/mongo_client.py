"""Reusable MongoDB client module for Travel-Tech Agentic AI.

Manages connections to:
1. scraper_db (raw scraped cluster: webscrape_travel_raw_data)
2. main_db (production travel-tech cluster: travel-tech)
"""

import os
import sys
from pathlib import Path
from typing import Tuple

# Ensure project root is in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection

# Ensure dnspython can reliably resolve mongodb+srv records even on slow/restrictive local router DNS
try:
    import dns.resolver
    _default_resolver = dns.resolver.get_default_resolver()
    for _ns in ["8.8.8.8", "1.1.1.1", "8.8.4.4"]:
        if _ns not in _default_resolver.nameservers:
            _default_resolver.nameservers.append(_ns)
    _default_resolver.timeout = 5.0
    _default_resolver.lifetime = 8.0
except Exception:
    pass

ENV_CANDIDATES = [
    PROJECT_ROOT / ".env",
    CURRENT_DIR.parent / ".env",
    Path.cwd() / ".env",
]

for env_path in ENV_CANDIDATES:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        break
else:
    load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
WEBSCRAPE_URI = os.getenv("webscrape_URI") or os.getenv("WEBSCRAPE_URI")

if not WEBSCRAPE_URI:
    raise ValueError("Missing 'webscrape_URI' in environment variables / .env file.")

if not MONGODB_URI:
    raise ValueError("Missing 'MONGODB_URI' in environment variables / .env file.")

# MongoDB Clients with resilient timeouts
try:
    scraper_client = MongoClient(WEBSCRAPE_URI, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
    scraper_db: Database = scraper_client["webscrape_travel_raw_data"]
except Exception as _e:
    print(f"[WARN] Failed to initialize scraper_client: {_e}")
    scraper_client = None
    scraper_db = None

try:
    main_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
    try:
        main_db: Database = main_client.get_default_database() or main_client["travel-tech"]
    except Exception:
        main_db: Database = main_client["travel-tech"]
except Exception as _e:
    print(f"[WARN] Failed to initialize main_client: {_e}")
    main_client = None
    main_db = None


def get_collection(db: Database, name: str) -> Collection:
    """Helper to retrieve a MongoDB collection from a specified database."""
    return db[name]


def ping_connections() -> Tuple[bool, bool]:
    """Tests connectivity to both MongoDB clusters.
    
    Returns:
        Tuple[bool, bool]: (scraper_ok, main_ok)
    """
    scraper_ok = False
    main_ok = False

    if scraper_client is not None:
        try:
            scraper_client.admin.command("ping")
            scraper_ok = True
        except Exception as e:
            print(f"[ERROR] Failed to ping scraper_db: {e}")

    if main_client is not None:
        try:
            main_client.admin.command("ping")
            main_ok = True
        except Exception as e:
            print(f"[ERROR] Failed to ping main_db: {e}")

    return scraper_ok, main_ok


if __name__ == "__main__":
    print("Testing MongoDB connections...")
    s_ok, m_ok = ping_connections()
    print(f"Scraper Cluster (webscrape_URI): {'ONLINE' if s_ok else 'OFFLINE'}")
    print(f"  Database: {scraper_db.name}")
    print(f"  Collections: {scraper_db.list_collection_names()}")
    print(f"Production Cluster (MONGODB_URI): {'ONLINE' if m_ok else 'OFFLINE'}")
    print(f"  Database: {main_db.name}")
    print(f"  Collections: {main_db.list_collection_names()}")
