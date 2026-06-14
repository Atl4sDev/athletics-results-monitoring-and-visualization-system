import csv
from typing import List
from pydantic import ValidationError

from utils.file_locks import read_lynx_file_safely
from models.schemas import Athlete
from models.enums import Gender
from utils.logger import logger

def parse_athletes_registry(filepath: str) -> List[Athlete]:
    """Parse the global athlete registry file (.ppl).

    Returns a list of validated Athlete DTOs. Invalid records (e.g. bad license
    format) are logged and discarded without interrupting the parse.
    """
    lines = read_lynx_file_safely(filepath)
    if not lines:
        return []

    data_lines = [line for line in lines if not line.startswith(';')]

    valid_athletes: List[Athlete] = []

    # csv.reader handles names containing commas (e.g. "Smith, Jr.")
    reader = csv.reader(data_lines)

    for line_number, row in enumerate(reader, start=1):
        if len(row) < 8:
            logger.debug(f"Skipping incomplete row #{line_number}: {row}")
            continue

        try:
            # Lynx "M"/"F" → API "MALE"/"FEMALE"
            raw_gender = row[5].strip().upper()
            mapped_gender = Gender.MALE if raw_gender == 'M' else (Gender.FEMALE if raw_gender == 'F' else Gender.MIXED)
            # Field mapping per Lynx ecosystem spec:
            # [1]: lastName, [2]: firstName, [4]: license, [5]: gender, [7]: birthDate
            athlete = Athlete(
                lastName=row[1].strip(),
                firstName=row[2].strip(),
                license=row[4].strip(),
                gender=mapped_gender,
                birthDate=row[7].strip()
            )
            valid_athletes.append(athlete)

        except ValidationError as e:
            error_msgs = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
            logger.warning(
                f"Rejected athlete at row {line_number} ({row[1]} {row[2]}). "
                f"Reasons: {error_msgs}"
            )
            continue

    logger.info(f".ppl parsing complete: found {len(valid_athletes)} valid profiles.")
    return valid_athletes
