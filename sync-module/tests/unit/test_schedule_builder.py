"""Unit tests for parser.schedule_builder.build_schedule_payload.

This is the merge step: .cmp metadata (gender, round name, date, time) is joined
with .evt start lists to produce validated ScheduleItem DTOs. The logic worth
pinning down is the time zero-padding (ADR-0004), the gender-code mapping, the
skip rules for unmatched event/round ids, and the "log-and-continue" behaviour
when an assembled item fails Pydantic validation.

These tests feed plain in-memory dicts, so they need no real Lynx files.
"""
import pytest

from parser.schedule_builder import build_schedule_payload
from models.schemas import Heat, Entry
from models.enums import Gender, AgeCategory


VALID_LICENSE = "FLAU-KV-12345"


def _heats():
    return [Heat(heatNumber=1, entries=[Entry(license=VALID_LICENSE, lane=1, bibNumber="101", team="Київ")])]


def _evt(**overrides):
    """One .evt entry keyed as it would be by parse_event_schedule ('14-1')."""
    data = dict(
        localEventId="14",
        localRoundId="1",
        disciplineCode="110H",
        eventName="110 м з/б",
        ageCategory=AgeCategory.U20,
        heats_data=_heats(),
    )
    data.update(overrides)
    return {"14-1": data}


def _cmp(gender="M", time="09:15:00", date="13.06.2026", name="Фінал", **round_overrides):
    rnd = {"Name": name, "Date": date, "Time": time}
    rnd.update(round_overrides)
    return {"14": {"Gender": gender, "rounds": {"1": rnd}}}


def test_happy_path_builds_one_item():
    result = build_schedule_payload(_cmp(), _evt())
    assert len(result) == 1
    item = result[0]
    assert item.localEventId == "14"
    assert item.localRoundId == "1"
    assert item.disciplineCode == "110H"
    assert item.roundName == "Фінал"
    assert item.ageCategory == AgeCategory.U20
    assert item.heats[0].entries[0].license == VALID_LICENSE


class TestTimePadding:
    def test_single_digit_hour_is_zero_padded(self):
        result = build_schedule_payload(_cmp(time="9:15:00"), _evt())
        assert result[0].time == "09:15:00"

    def test_already_padded_time_is_unchanged(self):
        result = build_schedule_payload(_cmp(time="09:15:00"), _evt())
        assert result[0].time == "09:15:00"

    def test_two_digit_hour_is_unchanged(self):
        result = build_schedule_payload(_cmp(time="14:05:00"), _evt())
        assert result[0].time == "14:05:00"

    def test_unpadded_time_yields_valid_item(self):
        # Regression guard: padding must happen before the Pydantic TIME_REGEX
        # gate, otherwise "9:15:00" would be dropped and the list would be empty.
        result = build_schedule_payload(_cmp(time="9:15:00"), _evt())
        assert len(result) == 1


class TestGenderMapping:
    @pytest.mark.parametrize(
        "code, expected",
        [
            ("M", Gender.MALE),
            ("F", Gender.FEMALE),
            ("X", Gender.MIXED),
            ("m", Gender.MALE),     # mapping upper-cases first
            ("f", Gender.FEMALE),
            ("?", Gender.MIXED),    # anything unrecognized -> MIXED
        ],
    )
    def test_gender_codes(self, code, expected):
        result = build_schedule_payload(_cmp(gender=code), _evt())
        assert result[0].gender == expected


class TestSkipRules:
    def test_event_id_missing_from_cmp_is_skipped(self):
        # .evt references event 14, but .cmp only knows about 99 -> no items.
        cmp = {"99": {"Gender": "M", "rounds": {"1": {"Name": "F", "Date": "13.06.2026", "Time": "09:15:00"}}}}
        assert build_schedule_payload(cmp, _evt()) == []

    def test_round_id_missing_from_cmp_is_skipped(self):
        cmp = {"14": {"Gender": "M", "rounds": {"2": {"Name": "F", "Date": "13.06.2026", "Time": "09:15:00"}}}}
        assert build_schedule_payload(cmp, _evt()) == []

    def test_one_valid_one_skipped(self):
        evt = _evt()
        evt["15-1"] = dict(
            localEventId="15",  # not in cmp
            localRoundId="1",
            disciplineCode="100",
            eventName="100 м",
            ageCategory=AgeCategory.SENIOR,
            heats_data=_heats(),
        )
        result = build_schedule_payload(_cmp(), evt)
        assert [i.localEventId for i in result] == ["14"]


class TestValidationResilience:
    def test_bad_date_is_logged_and_skipped_not_raised(self):
        # Malformed date fails ScheduleItem validation; builder must swallow it
        # and return an empty list rather than propagating the error.
        result = build_schedule_payload(_cmp(date="2026-06-13"), _evt())
        assert result == []

    def test_missing_date_is_skipped(self):
        result = build_schedule_payload(_cmp(date=""), _evt())
        assert result == []
