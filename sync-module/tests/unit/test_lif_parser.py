"""Unit tests for parser.lif_parser.parse_lif_file.

A FinishLynx .lif result file: the header row carries localEventId,
localRoundId, heatNumber (indices 0-2) and wind (index 11); each result row
carries place/status (0), mark (6), license (7), reacTime (9). A numeric place
maps to status OK; a non-numeric token maps to the matching ResultStatus enum;
rows without a license are skipped. The parser returns a ready ResultsSyncPayload
or None.
"""
import pytest

from parser.lif_parser import parse_lif_file
from models.enums import ResultStatus


# header: event 1, round 1, heat 1, wind 1.5 (index 11)
# rows: two finishers (OK), one DNS, one license-less row (skipped), one DQ.
LIF_TEXT = "\n".join([
    "1,1,1,100 м,,,,,,,,1.5",
    "1,1,Петренко,Іван,К,,10.52,FLAU-KV-384996,,0.142,,",
    "2,2,Ковальов,Олег,К,,10.61,FLAU-KV-761674,,0.155,,",
    "DNS,3,Сидоренко,Ігор,К,,,FLAU-KV-195115,,,,",
    ",4,Без,Ліцензії,К,,11.00,,,,,",            # no license at index 7 -> skipped
    "DQ,5,Дискваліф,Атлет,К,,,FLAU-KV-111111,,,,",
])


@pytest.fixture
def payload(lynx_file):
    return parse_lif_file(lynx_file("001-1-01.lif", LIF_TEXT))


class TestHeader:
    def test_identifiers_extracted(self, payload):
        assert payload is not None
        assert payload.localEventId == "1"
        assert payload.localRoundId == "1"
        assert payload.heatNumber == 1

    def test_wind_parsed_as_float(self, payload):
        assert payload.wind == pytest.approx(1.5)


class TestResults:
    def test_license_less_row_is_skipped(self, payload):
        # Five data rows, one has no license -> four results.
        assert len(payload.results) == 4
        assert all(r.license for r in payload.results)

    def test_numeric_place_maps_to_ok(self, payload):
        first = payload.results[0]
        assert first.license == "FLAU-KV-384996"
        assert first.place == 1
        assert first.status == ResultStatus.OK
        assert first.mark == "10.52"
        assert first.reacTime == pytest.approx(0.142)

    def test_dns_token_maps_to_status_without_place(self, payload):
        dns = next(r for r in payload.results if r.license == "FLAU-KV-195115")
        assert dns.status == ResultStatus.DNS
        assert dns.place is None
        assert dns.mark is None

    def test_dq_token_maps_to_status(self, payload):
        dq = next(r for r in payload.results if r.license == "FLAU-KV-111111")
        assert dq.status == ResultStatus.DQ
        assert dq.place is None


class TestWindAndReacEdgeCases:
    def test_missing_wind_is_none(self, lynx_file):
        text = "\n".join([
            "1,1,1,100 м",  # no index-11 wind column
            "1,1,Атлет,Один,К,,10.50,FLAU-KV-384996,,0.140,,",
        ])
        result = parse_lif_file(lynx_file("nw.lif", text))
        assert result.wind is None

    def test_unknown_status_token_defaults_to_pending(self, lynx_file):
        text = "\n".join([
            "1,1,1,100 м,,,,,,,,",
            "ZZZ,1,Атлет,Один,К,,,FLAU-KV-384996,,,,",
        ])
        result = parse_lif_file(lynx_file("z.lif", text))
        assert result.results[0].status == ResultStatus.PENDING


class TestNoneReturns:
    def test_empty_file_returns_none(self, lynx_file):
        assert parse_lif_file(lynx_file("empty.lif", "")) is None

    def test_comment_only_file_returns_none(self, lynx_file):
        assert parse_lif_file(lynx_file("c.lif", "; just a comment\n")) is None

    def test_non_numeric_heat_in_header_returns_none(self, lynx_file):
        text = "\n".join([
            "1,1,X,100 м,,,,,,,,1.5",  # heat number is not an int
            "1,1,Атлет,Один,К,,10.50,FLAU-KV-384996,,0.140,,",
        ])
        assert parse_lif_file(lynx_file("bad.lif", text)) is None

    def test_no_valid_results_returns_none(self, lynx_file):
        # Header is fine but the only data row has no license.
        text = "\n".join([
            "1,1,1,100 м,,,,,,,,1.5",
            ",4,Без,Ліцензії,К,,11.00,,,,,",
        ])
        assert parse_lif_file(lynx_file("nr.lif", text)) is None
