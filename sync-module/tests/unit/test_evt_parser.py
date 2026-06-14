"""Unit tests for parser.evt_parser.parse_event_schedule.

The .evt start list is parsed with a state machine: a row whose first column is
non-empty is a header (event, round, heat, discipline name); a row with an empty
first column is an athlete entry under the current header. Multiple headers with
the same event-round but different heat numbers accumulate heats. Entries that
fail Entry validation (e.g. bad license) are dropped without aborting the parse.
"""
import pytest

from parser.evt_parser import parse_event_schedule
from models.enums import AgeCategory


# Event 1 / round 1 has two heats; heat 2 contains one bad-license row (dropped)
# and one entry with an empty team (defaults to "Особисто"). Event 2 / round 1
# has a single heat.
EVT_TEXT = "\n".join([
    "1,1,1,100 м зб 0762 Ж-U16,,,,,,,,",
    ",194,3,Баранова,Марія,К,FLAU-KV-384996",
    ",465,1,Барков,Іван,К,FLAU-KV-761674",
    "1,1,2,100 м зб 0762 Ж-U16,,,,,,,,",
    ",500,2,Тест,Інвалід,К,BADLICENSE",
    ",501,5,Тест,Валід,,FLAU-KV-111111",
    "2,1,1,110 м зб 0840 Ч-U18,,,,,,,,",
    ",183,4,Баркалов,Микола,К,FLAU-KV-195115",
])


@pytest.fixture
def schedule(lynx_file):
    return parse_event_schedule(lynx_file("lynx.evt", EVT_TEXT))


class TestKeysAndMetadata:
    def test_keyed_by_event_round(self, schedule):
        assert set(schedule.keys()) == {"1-1", "2-1"}

    def test_discipline_normalization_is_applied(self, schedule):
        assert schedule["1-1"]["disciplineCode"] == "100H"
        assert schedule["1-1"]["ageCategory"] == AgeCategory.U16
        assert schedule["2-1"]["disciplineCode"] == "110H"
        assert schedule["2-1"]["ageCategory"] == AgeCategory.U18

    def test_raw_event_name_is_preserved(self, schedule):
        assert schedule["1-1"]["eventName"] == "100 м зб 0762 Ж-U16"

    def test_local_ids_are_strings(self, schedule):
        assert schedule["1-1"]["localEventId"] == "1"
        assert schedule["1-1"]["localRoundId"] == "1"


class TestHeatGrouping:
    def test_two_heats_collected_under_same_event_round(self, schedule):
        heats = schedule["1-1"]["heats_data"]
        assert [h.heatNumber for h in heats] == [1, 2]

    def test_heat_one_has_both_valid_entries(self, schedule):
        heat1 = schedule["1-1"]["heats_data"][0]
        licenses = [e.license for e in heat1.entries]
        assert licenses == ["FLAU-KV-384996", "FLAU-KV-761674"]

    def test_entry_fields_are_mapped(self, schedule):
        entry = schedule["1-1"]["heats_data"][0].entries[0]
        assert entry.bibNumber == "194"
        assert entry.lane == 3
        assert entry.team == "К"  # team taken from column 5 (affiliation)


class TestValidationAndDefaults:
    def test_bad_license_entry_is_dropped_but_parse_continues(self, schedule):
        # Heat 2 had two rows; the BADLICENSE one is rejected, leaving one entry.
        heat2 = schedule["1-1"]["heats_data"][1]
        assert [e.license for e in heat2.entries] == ["FLAU-KV-111111"]

    def test_empty_team_defaults_to_osobysto(self, schedule):
        # The valid heat-2 entry had an empty affiliation column.
        entry = schedule["1-1"]["heats_data"][1].entries[0]
        assert entry.team == "Особисто"


class TestEdgeCases:
    def test_empty_file_returns_empty_dict(self, lynx_file):
        assert parse_event_schedule(lynx_file("empty.evt", "")) == {}

    def test_missing_file_returns_empty_dict(self, tmp_path):
        assert parse_event_schedule(str(tmp_path / "nope.evt")) == {}
