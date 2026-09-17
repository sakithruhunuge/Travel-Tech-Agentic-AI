"""Singleton embedding loader module using SentenceTransformer ('all-MiniLM-L6-v2').

Loads the model ONCE on first import using a module-level singleton pattern,
preventing redundant model reloads on API requests.
"""

import sys
from pathlib import Path
from typing import List

# Ensure stdout and stderr support UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

from sentence_transformers import SentenceTransformer


class EmbeddingHelper:
    """Singleton helper class for embedding generation."""
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            print("🔄 Loading embedding model...")
            cls._instance = super(EmbeddingHelper, cls).__new__(cls)
            cls._model = SentenceTransformer("all-MiniLM-L6-v2")
            print("✅ Embedding model ready.")
        return cls._instance
