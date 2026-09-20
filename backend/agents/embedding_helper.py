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

    def encode(self, text: str) -> List[float]:
        """Encodes a single string into a 384-dimensional dense vector as a plain Python list of floats."""
        if not text:
            text = ""
        embedding = self._model.encode(text, show_progress_bar=False)
        if hasattr(embedding, "tolist"):
            embedding = embedding.tolist()
        return [float(x) for x in embedding]

    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Encodes a list of strings into a list of 384-dimensional dense vectors."""
        if not texts:
            return []
        embeddings = self._model.encode(texts, show_progress_bar=False)
        result: List[List[float]] = []
        for emb in embeddings:
            if hasattr(emb, "tolist"):
                emb = emb.tolist()
            result.append([float(x) for x in emb])
        return result


# Initialize module-level singleton instance on first import
_embedding_singleton = EmbeddingHelper()


def encode(text: str) -> List[float]:
    """Encodes a single string into a list of floats using the singleton embedding model."""
    return _embedding_singleton.encode(text)


def encode_batch(texts: List[str]) -> List[List[float]]:
    """Encodes a list of strings into a list of list of floats using the singleton embedding model."""
    return _embedding_singleton.encode_batch(texts)


if __name__ == "__main__":
    print("Testing embedding_helper module...")
    vec = encode("test query for hotel retrieval")
    print(f"Single encode dimension: {len(vec)}")
    print(f"Sample values (first 5): {vec[:5]}")
    batch_vecs = encode_batch(["hotel near beach", "historical site"])
    print(f"Batch encode count: {len(batch_vecs)} | Dim: {len(batch_vecs[0])}")
