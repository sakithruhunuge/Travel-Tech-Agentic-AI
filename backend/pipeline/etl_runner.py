"""Automated ETL Pipeline Runner for Sri Lanka Travel-Tech Agentic AI.

Sequentially executes:
1. db.cleaner.run_cleaner() -> Cleans & validates raw scraped hotel & POI records
2. db.feature_engineering.run_feature_engineering() -> Enriches spatial density, airport proximity, price tiers
3. db.vectorizer.run_vectorizer() -> Computes 384-d MiniLM embeddings for text_blobs
4. db.rag_validator.run_rag_validation() -> Audits staging collections for 100% RAG readiness

Prints execution timings for each stage and an overall pipeline summary.
"""

import sys
import time
from pathlib import Path
from typing import Dict, Any

# Ensure project root and backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR.parent))

# Unbuffered output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

try:
    from backend.db.cleaner import run_cleaner
    from backend.db.feature_engineering import run_feature_engineering
    from backend.db.vectorizer import run_vectorizer
    from backend.db.rag_validator import run_rag_validation
except ImportError:
    from db.cleaner import run_cleaner
    from db.feature_engineering import run_feature_engineering
    from db.vectorizer import run_vectorizer
    from db.rag_validator import run_rag_validation


def run_full_etl_pipeline(fix_validation: bool = False) -> Dict[str, Any]:
    """Runs the 4-stage data preparation and RAG embedding pipeline."""
    timings = {}
    pipeline_start = time.time()

    print("=" * 70)
    print("🚀 STARTING AUTOMATED TRAVEL-TECH ETL & VECTORIZATION PIPELINE")
    print("=" * 70)

    # Stage 1: Data Cleaner
    print("\n[STAGE 1/4] Running Data Cleaning & Ingestion Pipeline...")
    t0 = time.time()
    run_cleaner()
    timings["stage1_cleaner_s"] = round(time.time() - t0, 2)
    print(f"✅ Stage 1 complete in {timings['stage1_cleaner_s']}s")

    # Stage 2: Feature Engineering
    print("\n[STAGE 2/4] Running Geospatial & Feature Engineering...")
    t0 = time.time()
    run_feature_engineering()
    timings["stage2_feature_eng_s"] = round(time.time() - t0, 2)
    print(f"✅ Stage 2 complete in {timings['stage2_feature_eng_s']}s")

    # Stage 3: Vectorizer
    print("\n[STAGE 3/4] Running Sentence-Transformer Vectorizer...")
    t0 = time.time()
    run_vectorizer()
    timings["stage3_vectorizer_s"] = round(time.time() - t0, 2)
    print(f"✅ Stage 3 complete in {timings['stage3_vectorizer_s']}s")

    # Stage 4: RAG Readiness Validation
    print("\n[STAGE 4/4] Running RAG Readiness Validation Audit...")
    t0 = time.time()
    report = run_rag_validation(fix=fix_validation)
    timings["stage4_validation_s"] = round(time.time() - t0, 2)
    print(f"✅ Stage 4 complete in {timings['stage4_validation_s']}s")

    total_pipeline_time = round(time.time() - pipeline_start, 2)
    timings["total_pipeline_s"] = total_pipeline_time

    # Final Summary Table
    print("\n" + "=" * 70)
    print("🎉 ETL PIPELINE EXECUTION SUMMARY")
    print("=" * 70)
    print(f"{'Pipeline Stage':<45} | {'Duration (s)':<15}")
    print("-" * 70)
    print(f"{'1. Data Cleaner (cleaner.py)':<45} | {timings['stage1_cleaner_s']:<15}")
    print(f"{'2. Feature Engineering (feature_engineering.py)':<45} | {timings['stage2_feature_eng_s']:<15}")
    print(f"{'3. Vector Embeddings (vectorizer.py)':<45} | {timings['stage3_vectorizer_s']:<15}")
    print(f"{'4. RAG Validator (rag_validator.py)':<45} | {timings['stage4_validation_s']:<15}")
    print("-" * 70)
    print(f"{'Total End-to-End Pipeline Duration':<45} | {total_pipeline_time:<15} seconds")
    print(f"RAG Readiness Status: {'READY (100% compliant)' if report.get('overall_ready') else 'ACTION REQUIRED'}")
    print("=" * 70 + "\n")

    return {"timings": timings, "report": report}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run complete travel data ETL and embedding pipeline.")
    parser.add_argument("--fix", action="store_true", help="Auto-repair invalid documents during validation.")
    args = parser.parse_args()

    run_full_etl_pipeline(fix_validation=args.fix)
