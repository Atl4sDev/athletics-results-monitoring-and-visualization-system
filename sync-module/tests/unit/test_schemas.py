"""Unit tests for the Pydantic v2 validation gate in models.schemas.

Every record that reaches the SQLite buffer must first pass through these
models. The license/date/time regexes and field constraints are the contract
boundary with the backend, so they get direct, exhaustive coverage here rather
than only being exercised incidentally through the parsers.
"""
import pytest
from pydantic import ValidationError

from models.schemas import (
    Athlete,
    Entry,
    Heat,
    ScheduleItem,
    ResultItem,
    ResultsSyncPayload,
    MeetSyncPayload,
)
from models.enums import Gender, AgeCategory, ResultStatus


VALID_LICENSE = "FLAU-KV-12345"


def _athlete(**overrides):
    base = dict(
        license=VALID_LICENSE,
        firstName="Іван",
        lastName="Петренко",
        gender=Gender.MALE,
        birthDate="01.02.2003",
    )
    base.update(overrides)
    return base


def _entry(**overrides):
    base = dict(license=VALID_LICENSE, lane=1, bibNumber="101", team="Київ")
    base.update(overrides)
    return base


class TestLicenseRegex:
    """^FLAU-[A-Z]{2,3}-\\d{5,6}$ — shared by Athlete, Entry and ResultItem."""

    @pytest.mark.parametrize(
        "license_value",
        [
            "FLAU-KV-12345",     # 2 letters, 5 digits
            "FLAU-ABC-123456",   # 3 letters, 6 digits
            "FLAU-KV-123456",    # 2 letters, 6 digits
            "FLAU-ABC-12345",    # 3 letters, 5 digits
        ],
    )
    def test_valid_licenses_are_accepted(self, license_value):
        assert Athlete(**_athlete(license=license_value)).license == license_value

    @pytest.mark.parametrize(
        "license_value",
        [
            "FLAU-K-12345",       # only 1 letter
            "FLAU-KVDE-12345",    # 4 letters
            "FLAU-KV-1234",       # only 4 digits
            "FLAU-KV-1234567",    # 7 digits
            "flau-kv-12345",      # lowercase
            "FLAU-K1-12345",      # digit in the letter group
            "XXXX-KV-12345",      # wrong prefix
            "FLAU-KV-12345 ",     # trailing space (anchored regex)
            "",                    # empty
        ],
    )
    def test_invalid_licenses_are_rejected(self, license_value):
        with pytest.raises(ValidationError):
            Athlete(**_athlete(license=license_value))


class TestAthlete:
    def test_valid_athlete(self):
        a = Athlete(**_athlete())
        assert a.gender == Gender.MALE
        assert a.birthDate == "01.02.2003"

    @pytest.mark.parametrize(
        "bad_date",
        ["2003-02-01", "1.2.2003", "01/02/2003", "01.02.03", ""],
    )
    def test_birthdate_must_be_dd_mm_yyyy(self, bad_date):
        with pytest.raises(ValidationError):
            Athlete(**_athlete(birthDate=bad_date))

    def test_invalid_gender_string_is_rejected(self):
        with pytest.raises(ValidationError):
            Athlete(**_athlete(gender="M"))  # raw Lynx code, not the mapped enum


class TestEntry:
    def test_valid_entry(self):
        e = Entry(**_entry())
        assert e.lane == 1

    @pytest.mark.parametrize("lane", [0, -1, -5])
    def test_lane_must_be_positive(self, lane):
        with pytest.raises(ValidationError):
            Entry(**_entry(lane=lane))

    def test_empty_bib_is_rejected(self):
        with pytest.raises(ValidationError):
            Entry(**_entry(bibNumber=""))

    def test_empty_team_is_rejected(self):
        with pytest.raises(ValidationError):
            Entry(**_entry(team=""))


class TestScheduleItem:
    def _schedule_item(self, **overrides):
        base = dict(
            localEventId="14",
            localRoundId="1",
            disciplineCode="110H",
            eventName="110 м з/б",
            gender=Gender.MALE,
            ageCategory=AgeCategory.U20,
            roundName="Фінал",
            date="13.06.2026",
            time="09:15:00",
            heats=[Heat(heatNumber=1, entries=[Entry(**_entry())])],
        )
        base.update(overrides)
        return ScheduleItem(**base)

    def test_valid_schedule_item(self):
        item = self._schedule_item()
        assert item.time == "09:15:00"
        assert item.heats[0].entries[0].license == VALID_LICENSE

    def test_unpadded_time_is_rejected(self):
        # The schedule_builder is responsible for zero-padding BEFORE this gate;
        # a raw "9:15:00" must not slip through.
        with pytest.raises(ValidationError):
            self._schedule_item(time="9:15:00")

    @pytest.mark.parametrize("bad_time", ["09:15", "9:15", "091500", "09:15:00 "])
    def test_malformed_time_is_rejected(self, bad_time):
        with pytest.raises(ValidationError):
            self._schedule_item(time=bad_time)

    def test_optional_fields_may_be_omitted(self):
        item = self._schedule_item(eventName=None, ageCategory=None)
        assert item.eventName is None
        assert item.ageCategory is None


class TestResultItem:
    def test_status_defaults_to_pending(self):
        item = ResultItem(license=VALID_LICENSE)
        assert item.status == ResultStatus.PENDING
        assert item.place is None
        assert item.mark is None
        assert item.reacTime is None

    def test_full_result(self):
        item = ResultItem(
            license=VALID_LICENSE,
            place=1,
            status=ResultStatus.OK,
            mark="10.52",
            reacTime=0.142,
        )
        assert item.place == 1
        assert item.reacTime == pytest.approx(0.142)

    def test_invalid_status_is_rejected(self):
        with pytest.raises(ValidationError):
            ResultItem(license=VALID_LICENSE, status="WINNER")

    def test_non_numeric_reactime_is_rejected(self):
        with pytest.raises(ValidationError):
            ResultItem(license=VALID_LICENSE, reacTime="fast")


class TestContractPayloads:
    def test_results_sync_payload_roundtrips_to_json(self):
        payload = ResultsSyncPayload(
            localEventId="14",
            localRoundId="1",
            heatNumber=1,
            wind=1.3,
            results=[ResultItem(license=VALID_LICENSE, place=1, status=ResultStatus.OK)],
        )
        # The daemon serializes with model_dump_json(); make sure that path works
        # and that Cyrillic-free payloads stay intact.
        as_json = payload.model_dump_json()
        assert '"heatNumber":1' in as_json
        assert '"wind":1.3' in as_json

    def test_meet_sync_payload_accepts_empty_lists(self):
        payload = MeetSyncPayload(athletes=[], schedule=[])
        assert payload.athletes == []
        assert payload.schedule == []
