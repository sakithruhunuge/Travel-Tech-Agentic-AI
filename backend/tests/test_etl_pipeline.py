"""Tests for Data Preparation & Vectorization ETL Pipeline.

Covers:
- Sequential execution of all 4 ETL stages (cleaner, feature engineering, vectorizer, validator)
- Stage timing collection and total duration calculation
- Passing the fix_validation repair flag
"""

import pytest
from unittest.mock import patch, MagicMock
from backend.pipeline.etl_runner import run_full_etl_pipeline


@pytest.mark.unit
def test_etl_pipeline_sequential_execution():
    """run_full_etl_pipeline runs all 4 stages sequentially and reports timings."""
    mock_report = {"overall_ready": True, "hotels_valid": 100, "pois_valid": 50}

    with patch("backend.pipeline.etl_runner.run_cleaner") as mock_cleaner, \
         patch("backend.pipeline.etl_runner.run_feature_engineering") as mock_features, \
         patch("backend.pipeline.etl_runner.run_vectorizer") as mock_vectorizer, \
         patch("backend.pipeline.etl_runner.run_rag_validation", return_value=mock_report) as mock_validator:

        result = run_full_etl_pipeline(fix_validation=False)

        # Ensure all stages were executed exactly once
        mock_cleaner.assert_called_once()
        mock_features.assert_called_once()
        mock_vectorizer.assert_called_once()
        mock_validator.assert_called_once_with(fix=False)

        # Verify timings and report payload
        assert "timings" in result
        timings = result["timings"]
        assert "stage1_cleaner_s" in timings
        assert "stage2_feature_eng_s" in timings
        assert "stage3_vectorizer_s" in timings
        assert "stage4_validation_s" in timings
        assert "total_pipeline_s" in timings

        assert result["report"] == mock_report


@pytest.mark.unit
def test_etl_pipeline_fix_flag_propagation():
    """run_full_etl_pipeline correctly passes fix_validation=True to run_rag_validation."""
    with patch("backend.pipeline.etl_runner.run_cleaner"), \
         patch("backend.pipeline.etl_runner.run_feature_engineering"), \
         patch("backend.pipeline.etl_runner.run_vectorizer"), \
         patch("backend.pipeline.etl_runner.run_rag_validation", return_value={"overall_ready": True}) as mock_validator:

        run_full_etl_pipeline(fix_validation=True)
        mock_validator.assert_called_once_with(fix=True)
