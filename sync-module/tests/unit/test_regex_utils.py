"""Unit tests for parser.regex_utils.normalize_discipline_name.

This is the purest piece of logic in the codebase: raw Ukrainian discipline
name in, standardized (disciplineCode, ageCategory) out, no I/O. It encodes the
FLAU shorthand -> code mapping that everything downstream depends on, so it
deserves exhaustive coverage.
"""
import pytest

from parser.regex_utils import normalize_discipline_name
from models.enums import AgeCategory


class TestDisciplineCode:
    """Distance extraction, unit conversion, and event-type suffixes."""

    @pytest.mark.parametrize(
        "raw_name, expected_code",
        [
            # Plain track distances -> bare metre count.
            ("100 м Ч", "100"),
            ("400 м Ж", "400"),
            ("3000 м Ж", "3000"),
            # Hurdles: 'зб' -> H. Spellings match real .evt data, e.g.
            # "110 м зб 0840 Ч-U16" (no slash).
            ("110 м зб 0840 Ч-U16", "110H"),
            ("400 м зб Ж-U23", "400H"),
            # Steeplechase: 'зп' -> SC.
            ("3000 м зп Ж-U18", "3000SC"),
            # Race walking: 'сх' -> W.
            ("Сх 20 км Ч", "20000W"),
            # Kilometres are converted to metres.
            ("10 км Ч", "10000"),
            ("Спортивна ходьба 10000 м Ж", "10000"),
        ],
    )
    def test_known_disciplines_map_to_codes(self, raw_name, expected_code):
        assert normalize_discipline_name(raw_name)["disciplineCode"] == expected_code

    def test_kilometres_multiply_by_1000(self):
        assert normalize_discipline_name("5 км Ч")["disciplineCode"] == "5000"

    def test_metres_are_not_scaled(self):
        assert normalize_discipline_name("5000 м Ч")["disciplineCode"] == "5000"

    def test_walking_suffix_takes_priority_over_others(self):
        # 'сх' is checked before 'зб'/'зп' in the implementation.
        result = normalize_discipline_name("сх зб 20 км")
        assert result["disciplineCode"] == "20000W"

    def test_name_without_a_distance_is_unknown(self):
        # Relays / field events with no numeric distance fall back to UNKNOWN.
        result = normalize_discipline_name("Естафета шведська")
        assert result["disciplineCode"] == "UNKNOWN"
        assert result["ageCategory"] == AgeCategory.SENIOR


class TestAgeCategory:
    """Age-group detection from the 'uNN' and masters '-мNN'/'-жNN' suffixes."""

    @pytest.mark.parametrize(
        "raw_name, expected_age",
        [
            ("110 м зб Ч-U20", AgeCategory.U20),
            ("3000 м зп Ж-U18", AgeCategory.U18),
            ("400 м зб Ж-U23", AgeCategory.U23),
            ("100 м Ч-U14", AgeCategory.U14),
            ("100 м Ч-U16", AgeCategory.U16),
        ],
    )
    def test_under_categories(self, raw_name, expected_age):
        assert normalize_discipline_name(raw_name)["ageCategory"] == expected_age

    def test_age_detection_is_case_insensitive(self):
        assert normalize_discipline_name("100 м ч-u20")["ageCategory"] == AgeCategory.U20

    def test_no_age_marker_defaults_to_senior(self):
        assert normalize_discipline_name("100 м Ч")["ageCategory"] == AgeCategory.SENIOR

    @pytest.mark.parametrize("raw_name", ["1500 м Ч-М45", "1500 м Ж-ж35"])
    def test_masters_suffix_maps_to_masters(self, raw_name):
        assert normalize_discipline_name(raw_name)["ageCategory"] == AgeCategory.MASTERS

    def test_unrecognized_under_category_falls_back_to_senior(self):
        # 'U99' matches the uNN pattern but is not a real AgeCategory member.
        assert normalize_discipline_name("100 м Ч-U99")["ageCategory"] == AgeCategory.SENIOR


def test_return_shape_is_stable():
    result = normalize_discipline_name("100 м Ч")
    assert set(result.keys()) == {"disciplineCode", "ageCategory"}
    assert isinstance(result["disciplineCode"], str)
    assert isinstance(result["ageCategory"], AgeCategory)
