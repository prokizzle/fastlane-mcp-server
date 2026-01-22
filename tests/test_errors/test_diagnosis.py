"""Tests for error diagnosis."""

import pytest
from fastlane_mcp.errors.diagnosis import diagnose_error


class TestDiagnoseError:
    def test_matches_known_error(self):
        error = "Error: No signing certificate found"
        result = diagnose_error(error)

        assert result["matched"] is True
        assert "certificate" in result["message"].lower()
        assert len(result["suggestions"]) > 0

    def test_returns_generic_for_unknown_error(self):
        error = "Some completely unknown error xyz123"
        result = diagnose_error(error)

        assert result["matched"] is False
        assert "original" in result

    def test_provides_suggestions_for_known_error(self):
        error = "xcode-select: error: no developer tools were found"
        result = diagnose_error(error)

        assert result["matched"] is True
        assert any("xcode-select" in s for s in result["suggestions"])

    def test_handles_empty_input(self):
        result = diagnose_error("")
        assert result["matched"] is False

    def test_handles_multiline_error(self):
        error = """
Build failed with error:
Code Sign error: No certificate
Please check your signing configuration.
"""
        result = diagnose_error(error)
        assert result["matched"] is True
        assert "certificate" in result["message"].lower()

    def test_returns_diagnosis_details(self):
        error = "Provisioning profile not found"
        result = diagnose_error(error)

        assert "message" in result
        assert "diagnosis" in result
        assert "suggestions" in result
