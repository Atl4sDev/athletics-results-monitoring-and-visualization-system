from pydantic import BaseModel, Field
from typing import List, Optional
from .enums import Gender, AgeCategory, ResultStatus

LICENSE_REGEX = r"^FLAU-[A-Z]{2,3}-\d{5,6}$"
DATE_REGEX = r"^\d{2}\.\d{2}\.\d{4}$"   # DD.MM.YYYY
TIME_REGEX = r"^\d{2}:\d{2}:\d{2}$"     # HH:MM:SS


class Athlete(BaseModel):
    """Registered athlete with a valid FLAU license."""
    license: str = Field(..., pattern=LICENSE_REGEX, description="FLAU License ID")
    firstName: str
    lastName: str
    gender: Gender
    birthDate: str = Field(..., pattern=DATE_REGEX)


class Entry(BaseModel):
    """A single athlete entry within a heat start list."""
    license: str = Field(..., pattern=LICENSE_REGEX)
    lane: int = Field(..., gt=0, description="Lane number must be a positive integer")
    bibNumber: str = Field(..., min_length=1, description="Bib number cannot be empty")
    team: str = Field(..., min_length=1, description="Team name cannot be empty")


class Heat(BaseModel):
    """A single heat containing its number and the list of entries."""
    heatNumber: int
    entries: List[Entry]


class ScheduleItem(BaseModel):
    """A schedule entry representing one round of a discipline."""
    localEventId: str
    localRoundId: str
    disciplineCode: str
    eventName: Optional[str] = None
    gender: Gender
    ageCategory: Optional[AgeCategory] = None
    roundName: str
    date: str = Field(..., pattern=DATE_REGEX)
    time: str = Field(..., pattern=TIME_REGEX)
    heats: List[Heat]


class MeetSyncPayload(BaseModel):
    """Contract 1: POST /api/v1/sync/meet — meet initialization or update payload."""
    athletes: List[Athlete]
    schedule: List[ScheduleItem]


class ResultItem(BaseModel):
    """A single athlete result record."""
    license: str = Field(..., pattern=LICENSE_REGEX)
    place: Optional[int] = None
    status: ResultStatus = ResultStatus.PENDING
    mark: Optional[str] = None
    reacTime: Optional[float] = None


class ResultsSyncPayload(BaseModel):
    """Contract 2: POST /api/v1/sync/results — live result streaming payload."""
    localEventId: str
    localRoundId: str
    heatNumber: int
    wind: Optional[float] = None
    results: List[ResultItem]
