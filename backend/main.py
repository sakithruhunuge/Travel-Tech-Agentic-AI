"""FastAPI application entrypoint for Travel Agentic AI platform."""

import sys
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager

# Configure UTF-8 for standard output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.db.mongo_client import (
        ping_connections,
        scraper_client,
        main_client,
    )
    from backend.api.routes import router as api_router, agent_router
except ImportError:
    from db.mongo_client import (
        ping_connections,
        scraper_client,
        main_client,
    )
    from api.routes import router as api_router, agent_router


import asyncio

async def _background_db_ping():
    loop = asyncio.get_running_loop()
    try:
        scraper_ok, main_ok = await loop.run_in_executor(None, ping_connections)
        print(f"MongoDB Scraper Cluster : {'[CONNECTED]' if scraper_ok else '[OFFLINE]'}")
        print(f"MongoDB Production/Staging: {'[CONNECTED]' if main_ok else '[OFFLINE]'}")
    except Exception as e:
        print(f"[WARN] Database connection ping failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initializes non-blocking database connectivity and closes clients on shutdown."""
    print("=" * 60)
    print("[STARTING] Travel Agentic AI Backend (FastAPI)")
    print("=" * 60)
    asyncio.create_task(_background_db_ping())

    yield

    # Clean shutdown
    print("\n[INFO] Closing MongoDB client connections...")
    try:
        scraper_client.close()
        main_client.close()
        print("[INFO] MongoDB connections cleanly closed.")
    except Exception as e:
        print(f"[WARN] Error during database shutdown: {e}")


app = FastAPI(
    title="Travel Agentic AI",
    version="1.0.0",
    description="4-Agent AI Travel Itinerary Generator for Sri Lanka",
    lifespan=lifespan,
)

# CORS Middleware configuration (supports localhost, subdomains like ceylon-safari.localhost, and 127.0.0.1)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://([a-zA-Z0-9-]+\.)*(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(agent_router)
app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint confirming API service operational status."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Travel Agentic AI",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
