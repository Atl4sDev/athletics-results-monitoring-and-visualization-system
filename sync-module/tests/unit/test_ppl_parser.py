"""Unit tests for parser.ppl_parser.parse_athletes_registry.

The .ppl registry is CSV: ID, lastName, firstName, affiliation, license, gender,
event-numbers, birthDate (8+ columns). The parser maps fixed indices to the
Athlete DTO, converts the Lynx M/F gender code, skips short rows, and drops rows
that fail validation (e.g. malformed license) while continuing the parse.
"""
import pytest

from parser.ppl_parser import parse_athletes_registry
from models.enums import Gender


PPL_TEXT = "\n".join([
    "; ID, last, first, affiliation, license, gender, events, birthdate",
    "17,Кудрявцев,Владислав,Сум,FLAU-SUM-553743,M,11,19.11.2012",
    "21,Жінка,Олена,Київ,FLAU-KV-777777,F,7,05.05.2010",
    "99,Бад,Ліцензія,Київ,BADLICENSE,F,5,01.01.2000",
    "30,Шорт,Роу,Київ,FLAU-KV-222222,M",  # only 6 columns -> skipped
])


@pytest.fixture
def athletes(lynx_file):
    return parse_athletes_registry(lynx_file("lynx.ppl", PPL_TEXT))


class TestValidRecords:
    def test_only_valid_full_rows_are_returned(self, athletes):
        # 17 and 21 are valid; 99 has a bad license, 30 is too short.
        assert len(athletes) == 2

    def test_field_mapping(self, athletes):
        a = athletes[0]
        assert a.lastName == "Кудрявцев"
        assert a.firstName == "Владислав"
        assert a.license == "FLAU-SUM-553743"
        assert a.birthDate == "19.11.2012"

    def test_gender_code_male_maps_to_enum(self, athletes):
        assert athletes[0].gender == Gender.MALE

    def test_gender_code_female_maps_to_enum(self, athletes):
        assert athletes[1].gender == Gender.FEMALE


class TestRejection:
    def test_bad_license_is_not_in_results(self, athletes):
        assert all(a.license != "BADLICENSE" for a in athletes)
        assert all(a.lastName != "Бад" for a in athletes)

    def test_short_row_is_skipped(self, athletes):
        assert all(a.lastName != "Шорт" for a in athletes)


class TestEdgeCases:
    def test_comment_only_file_returns_empty_list(self, lynx_file):
        assert parse_athletes_registry(lynx_file("c.ppl", "; just a header\n")) == []

    def test_empty_file_returns_empty_list(self, lynx_file):
        assert parse_athletes_registry(lynx_file("empty.ppl", "")) == []

    def test_missing_file_returns_empty_list(self, tmp_path):
        assert parse_athletes_registry(str(tmp_path / "nope.ppl")) == []

    def test_unknown_gender_code_maps_to_mixed(self, lynx_file):
        text = "5,Невідомо,Стать,Київ,FLAU-KV-999999,Z,1,01.01.2000\n"
        result = parse_athletes_registry(lynx_file("g.ppl", text))
        assert len(result) == 1
        assert result[0].gender == Gender.MIXED
