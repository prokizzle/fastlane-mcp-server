"""Tests for error patterns."""

import pytest
from fastlane_mcp.errors.patterns import ERROR_PATTERNS


class TestErrorPatterns:
    def test_all_patterns_have_required_fields(self):
        for pattern in ERROR_PATTERNS:
            assert pattern.id, "Pattern must have id"
            assert pattern.pattern, "Pattern must have regex pattern"
            assert pattern.category, "Pattern must have category"
            assert pattern.message, "Pattern must have message"
            assert pattern.diagnosis, "Pattern must have diagnosis"
            assert isinstance(pattern.suggestions, list), "Suggestions must be list"
            assert len(pattern.suggestions) > 0, "Must have at least one suggestion"

    def test_signing_certificate_pattern_matches(self):
        pattern = next(p for p in ERROR_PATTERNS if p.id == "no_signing_certificate")

        test_cases = [
            "No signing certificate",
            "Code Sign error: No certificate",
            "error: No signing certificate 'iPhone Distribution'",
        ]

        for test_case in test_cases:
            assert pattern.pattern.search(test_case), f"Should match: {test_case}"

    def test_provisioning_profile_pattern_matches(self):
        pattern = next(p for p in ERROR_PATTERNS if p.id == "no_provisioning_profile")

        test_cases = [
            "No provisioning profile",
            "Provisioning profile not found",
            "couldn't find provisioning profile",
        ]

        for test_case in test_cases:
            assert pattern.pattern.search(test_case), f"Should match: {test_case}"

    def test_xcode_select_pattern_matches(self):
        pattern = next(p for p in ERROR_PATTERNS if p.id == "xcode_not_selected")

        assert pattern.pattern.search("xcode-select: error")
        assert pattern.pattern.search("no developer tools were found")
