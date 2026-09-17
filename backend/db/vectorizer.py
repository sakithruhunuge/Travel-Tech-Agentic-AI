"""Vectorization pipeline for travel staging database.

Generates 384-dimensional dense vector embeddings using sentence-transformers
('all-MiniLM-L6-v2') from pre-constructed 'text_blob' fields in staged_hotels
and staged_places.

Stores embeddings as native float lists in MongoDB and sets embedding_ready=True.
"""

import sys
import time
from pathlib import Path
from typing import List, Dict, Any

# Ensure stdout and stderr support UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

from pymongo import UpdateOne
from sentence_transformers import SentenceTransformer

try:
    from backend.db.mongo_client import main_db
except ImportError:
    from mongo_client import main_db

# Load embedding model once at module initialization
MODEL_NAME = "all-MiniLM-L6-v2"
print(f"[*] Loading sentence-transformer model '{MODEL_NAME}'...")
model = SentenceTransformer(MODEL_NAME)
try:
    embedding_dim = model.get_embedding_dimension()
except AttributeError:
    embedding_dim = model.get_sentence_embedding_dimension()
print(f"✅ Model loaded: {MODEL_NAME} | Embedding dim: {embedding_dim}")


def process_collection_embeddings(
    collection,
    collection_label: str,
    batch_size: int = 32,
) -> int:
    """Fetches un-embedded documents, generates embeddings in batches of 32,
    and updates MongoDB in-place via bulk_write."""
    query = {"embedding_ready": {"$ne": True}}
    total_docs = collection.count_documents(query)

    if total_docs == 0:
        print(f"[*] All documents in '{collection_label}' already have embeddings.")
        return 0

    total_batches = (total_docs + batch_size - 1) // batch_size
    print(
        f"[*] Starting vectorization for '{collection_label}': "
        f"{total_docs:,} documents across {total_batches:,} batches (batch_size={batch_size})."
    )

    embedded_count = 0
    batch_num = 0

    # Stream cursor
    cursor = collection.find(query, {"_id": 1, "text_blob": 1, "name": 1})

    batch_docs: List[Dict[str, Any]] = []

    def flush_batch(docs: List[Dict[str, Any]], b_idx: int) -> int:
        if not docs:
            return 0
        try:
            texts = [
                d.get("text_blob") or d.get("name") or "Sri Lanka Travel Point"
                for d in docs
            ]
            # Generate embeddings with SentenceTransformer
            embeddings = model.encode(texts, show_progress_bar=False)

            bulk_ops = []
            for doc, emb in zip(docs, embeddings):
                # Ensure embedding is stored as native Python float list
                float_embedding = [float(x) for x in emb.tolist()]
                bulk_ops.append(
                    UpdateOne(
                        {"_id": doc["_id"]},
                        {
                            "$set": {
                                "embedding": float_embedding,
                                "embedding_ready": True,
                            }
                        },
                    )
                )

            res = collection.bulk_write(bulk_ops, ordered=False)
            count = res.matched_count

            if b_idx % 10 == 0 or b_idx == total_batches:
                print(f"{collection_label}: batch {b_idx}/{total_batches} processed")

            return count
        except Exception as e:
            print(f"[ERROR] Failed batch {b_idx} in '{collection_label}': {e}")
            # Fallback: attempt per-document embedding to isolate faulty record
            success_count = 0
            for doc in docs:
                try:
                    single_text = (
                        doc.get("text_blob")
                        or doc.get("name")
                        or "Sri Lanka Travel Point"
                    )
                    single_emb = model.encode(
                        [single_text], show_progress_bar=False
                    )[0]
                    collection.update_one(
                        {"_id": doc["_id"]},
                        {
                            "$set": {
                                "embedding": [float(x) for x in single_emb.tolist()],
                                "embedding_ready": True,
                            }
                        },
                    )
                    success_count += 1
                except Exception as doc_err:
                    print(
                        f"[LOG FAILURE] Document _id={doc.get('_id')} failed embedding: {doc_err}"
                    )
            return success_count

    for doc in cursor:
        batch_docs.append(doc)
        if len(batch_docs) >= batch_size:
            batch_num += 1
            embedded_count += flush_batch(batch_docs, batch_num)
            batch_docs = []

    # Flush final remaining batch
    if batch_docs:
        batch_num += 1
        embedded_count += flush_batch(batch_docs, batch_num)
        batch_docs = []

    return embedded_count


def run_vectorizer():
    """Main vectorization runner for staged_hotels and staged_places."""
    start_time = time.time()
    staging_db = main_db.client["travel_staging"]
    hotels_col = staging_db["staged_hotels"]
    places_col = staging_db["staged_places"]

    print("=" * 65)
    print("STARTING DENSE VECTOR EMBEDDING PIPELINE")
    print(f"Target Staging Database: {staging_db.name}")
    print(f"Embedding Model        : {MODEL_NAME} (384 dimensions)")
    print("=" * 65)

    # 1. Vectorize Hotels
    hotels_embedded = process_collection_embeddings(
        hotels_col, collection_label="Hotels", batch_size=32
    )

    # 2. Vectorize POIs / Places
    pois_embedded = process_collection_embeddings(
        places_col, collection_label="POIs", batch_size=32
    )

    total_time = round(time.time() - start_time, 2)

    # Retrieve a sample embedding for verification
    sample_hotel = hotels_col.find_one({"embedding": {"$exists": True}})
    sample_emb = sample_hotel.get("embedding", []) if sample_hotel else []
    sample_shape = (len(sample_emb),)
    sample_preview = [round(x, 4) for x in sample_emb[:5]]

    print("\n" + "=" * 65)
    print("=== VECTORIZATION COMPLETE ===")
    print(
        f"Hotels embedded: {hotels_embedded:,} | POIs embedded: {pois_embedded:,} | Total time: {total_time} seconds"
    )
    print(f"Sample hotel embedding shape: {sample_shape}")
    print(f"Sample hotel embedding[:5]: {sample_preview}")
    print("=" * 65)


if __name__ == "__main__":
    run_vectorizer()
