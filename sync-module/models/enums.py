from enum import Enum

class Gender(str, Enum):
    """Athlete gender for a competition entry."""
    MALE = 'MALE'
    FEMALE = 'FEMALE'
    MIXED = 'MIXED'

class AgeCategory(str, Enum):
    """FLAU age-group categories."""
    U14 = 'U14'
    U16 = 'U16'
    U18 = 'U18'
    U20 = 'U20'
    U23 = 'U23'
    SENIOR = 'SENIOR'
    MASTERS = 'MASTERS'

class ResultStatus(str, Enum):
    """Standardized result status codes."""
    OK = 'OK'
    DNS = 'DNS'
    DNF = 'DNF'
    DQ = 'DQ'
    FS = 'FS'
    PENDING = 'PENDING'
