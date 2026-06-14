"""Unit tests for parser.cmp_parser.parse_competition_config.

The .cmp file is a flat key-value tree (\\Event\\Info\\<id>\\<key>=<val> and a
nested \\Round\\<rid>\\ level). The parser rebuilds the event/round hierarchy and
applies the MVP scope filter: field events, relays, and events with no rounds
are dropped. Fixtures mirror the real lynx.cmp layout, including the single-digit
hour ("9:00:00") that the schedule builder later zero-pads.
"""
import pytest

from parser.cmp_parser import parse_competition_config


CMP_TEXT = "\n".join([
    "Registry Version: 1.00",
    "\\Competition\\Name:String,1=TestMeet",
    "; --- Event 1: valid track event, single round ---",
    "\\Event\\Info\\1\\Gender:String,1=F",
    "\\Event\\Info\\1\\Type:String,1=Track",
    "\\Event\\Info\\1\\Relay:Bool,1=0",
    "\\Event\\Info\\1\\Round\\1\\Name:String,1=Фінал",
    "\\Event\\Info\\1\\Round\\1\\Date:String,1=18.05.2026",
    "\\Event\\Info\\1\\Round\\1\\Time:String,1=9:00:00",
    "; --- Event 2: FIELD event -> filtered out ---",
    "\\Event\\Info\\2\\Gender:String,1=M",
    "\\Event\\Info\\2\\Type:String,1=Field",
    "\\Event\\Info\\2\\Relay:Bool,1=0",
    "\\Event\\Info\\2\\Round\\1\\Name:String,1=Фінал",
    "\\Event\\Info\\2\\Round\\1\\Date:String,1=18.05.2026",
    "\\Event\\Info\\2\\Round\\1\\Time:String,1=10:00:00",
    "; --- Event 3: RELAY -> filtered out ---",
    "\\Event\\Info\\3\\Gender:String,1=M",
    "\\Event\\Info\\3\\Type:String,1=Track",
    "\\Event\\Info\\3\\Relay:Bool,1=1",
    "\\Event\\Info\\3\\Round\\1\\Name:String,1=Фінал",
    "\\Event\\Info\\3\\Round\\1\\Date:String,1=18.05.2026",
    "\\Event\\Info\\3\\Round\\1\\Time:String,1=11:00:00",
    "; --- Event 4: track but NO ROUNDS -> filtered out ---",
    "\\Event\\Info\\4\\Gender:String,1=M",
    "\\Event\\Info\\4\\Type:String,1=Track",
    "\\Event\\Info\\4\\Relay:Bool,1=0",
    "; --- Event 5: valid track event, TWO rounds ---",
    "\\Event\\Info\\5\\Gender:String,1=M",
    "\\Event\\Info\\5\\Type:String,1=Track",
    "\\Event\\Info\\5\\Relay:Bool,1=0",
    "\\Event\\Info\\5\\Round\\1\\Name:String,1=Забіг",
    "\\Event\\Info\\5\\Round\\1\\Date:String,1=18.05.2026",
    "\\Event\\Info\\5\\Round\\1\\Time:String,1=12:30:00",
    "\\Event\\Info\\5\\Round\\2\\Name:String,1=Фінал",
    "\\Event\\Info\\5\\Round\\2\\Date:String,1=19.05.2026",
    "\\Event\\Info\\5\\Round\\2\\Time:String,1=14:00:00",
])


@pytest.fixture
def cmp(lynx_file):
    return parse_competition_config(lynx_file("lynx.cmp", CMP_TEXT))


class TestScopeFiltering:
    def test_only_valid_running_events_survive(self, cmp):
        # 1 and 5 are valid; 2 (field), 3 (relay), 4 (no rounds) are dropped.
        assert set(cmp.keys()) == {"1", "5"}

    def test_field_event_is_excluded(self, cmp):
        assert "2" not in cmp

    def test_relay_event_is_excluded(self, cmp):
        assert "3" not in cmp

    def test_event_without_rounds_is_excluded(self, cmp):
        assert "4" not in cmp


class TestEventStructure:
    def test_event_level_attributes(self, cmp):
        assert cmp["1"]["Gender"] == "F"
        assert cmp["1"]["Type"] == "Track"
        assert cmp["1"]["Relay"] == "0"

    def test_round_attributes_are_nested(self, cmp):
        rnd = cmp["1"]["rounds"]["1"]
        assert rnd["Name"] == "Фінал"
        assert rnd["Date"] == "18.05.2026"
        # Single-digit hour is preserved verbatim here (padding happens later).
        assert rnd["Time"] == "9:00:00"

    def test_multiple_rounds_are_collected(self, cmp):
        rounds = cmp["5"]["rounds"]
        assert set(rounds.keys()) == {"1", "2"}
        assert rounds["1"]["Name"] == "Забіг"
        assert rounds["2"]["Name"] == "Фінал"


class TestEdgeCases:
    def test_empty_file_returns_empty_dict(self, lynx_file):
        assert parse_competition_config(lynx_file("empty.cmp", "")) == {}

    def test_missing_file_returns_empty_dict(self, tmp_path):
        assert parse_competition_config(str(tmp_path / "nope.cmp")) == {}

    def test_comment_and_structural_lines_are_ignored(self, lynx_file):
        # Lines like '\\Event\\Info\\1\\:,1=' and ';' comments must not crash or
        # create phantom keys.
        text = "\n".join([
            "; a comment",
            "\\Event\\Info\\1\\:,1=",
            "\\Event\\Info\\1\\Round\\:,1=",
            "\\Event\\Info\\1\\Gender:String,1=M",
            "\\Event\\Info\\1\\Type:String,1=Track",
            "\\Event\\Info\\1\\Relay:Bool,1=0",
            "\\Event\\Info\\1\\Round\\1\\Name:String,1=Фінал",
            "\\Event\\Info\\1\\Round\\1\\Date:String,1=18.05.2026",
            "\\Event\\Info\\1\\Round\\1\\Time:String,1=09:00:00",
        ])
        result = parse_competition_config(lynx_file("c.cmp", text))
        assert set(result.keys()) == {"1"}
        assert set(result["1"]["rounds"].keys()) == {"1"}
