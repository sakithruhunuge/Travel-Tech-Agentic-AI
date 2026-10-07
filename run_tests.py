"""Cross-platform test runner CLI for Travel-Tech Agentic AI.

Usage examples:
    python run_tests.py                  # Run all tests
    python run_tests.py --unit           # Run unit tests only
    python run_tests.py --integration    # Run integration tests
    python run_tests.py --e2e            # Run end-to-end tests
    python run_tests.py --cov            # Run with coverage report
"""

import sys
import subprocess
import argparse
from pathlib import Path

# Configure UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description="Travel-Tech Agentic AI Test Suite Runner")
    parser.add_argument("--unit", action="store_true", help="Run fast unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests")
    parser.add_argument("--e2e", action="store_true", help="Run end-to-end pipeline tests")
    parser.add_argument("--cov", action="store_true", help="Run with coverage report")
    parser.add_argument("-k", type=str, help="Filter tests by keyword/expression")
    parser.add_argument("-v", "--verbose", action="store_true", help="Extra verbose output")
    parser.add_argument("extra_args", nargs="*", help="Additional pytest arguments")

    args = parser.parse_args()

    pytest_cmd = [sys.executable, "-m", "pytest"]

    # Marker filtering
    markers = []
    if args.unit:
        markers.append("unit")
    if args.integration:
        markers.append("integration")
    if args.e2e:
        markers.append("e2e")

    if markers:
        pytest_cmd.extend(["-m", " or ".join(markers)])

    if args.cov:
        pytest_cmd.extend([
            "--cov=backend/agents",
            "--cov=backend/pipeline",
            "--cov=backend/api",
            "--cov-report=term-missing"
        ])

    if args.k:
        pytest_cmd.extend(["-k", args.k])

    if args.verbose:
        pytest_cmd.append("-vv")

    if args.extra_args:
        pytest_cmd.extend(args.extra_args)

    print("=" * 70)
    print("🚀 RUNNING TRAVEL-TECH AGENTIC AI TEST SUITE")
    print(f"Command: {' '.join(pytest_cmd)}")
    print("=" * 70)

    result = subprocess.run(pytest_cmd, cwd=str(PROJECT_ROOT))
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
