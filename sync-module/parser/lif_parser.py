import csv
from typing import Optional
from pydantic import ValidationError

from utils.file_locks import read_lynx_file_safely
from models.schemas import ResultItem, ResultsSyncPayload
from models.enums import ResultStatus
from utils.logger import logger

def parse_lif_file(filepath: str) -> Optional[ResultsSyncPayload]:
    """Parse a FinishLynx result file (.lif).

    Extracts race identifiers from the first (header) row and builds a ResultItem
    list for each athlete. Returns a ready-to-send ResultsSyncPayload DTO.
    """
    lines = read_lynx_file_safely(filepath)
    if not lines:
        return None

    data_lines = [line for line in lines if line.strip() and not line.startswith(';')]
    if not data_lines:
        logger.warning(f"File {filepath} is empty or contains only comments.")
        return None

    reader = csv.reader(data_lines)
    rows = list(reader)

    header_row = rows[0]
    if len(header_row) < 3:
        logger.error(f"Invalid header in file {filepath}: {header_row}")
        return None

    try:
        local_event_id = header_row[0].strip()
        local_round_id = header_row[1].strip()
        heat_number = int(header_row[2].strip())

        # Wind speed is stored at header index 11 and may be absent
        wind: Optional[float] = None
        if len(header_row) > 11 and header_row[11].strip():
            try:
                wind = float(header_row[11].strip())
            except ValueError:
                pass

    except ValueError as e:
        logger.error(f"Failed to parse identifiers in header of {filepath}: {e}")
        return None

    result_items = []

    for line_number, row in enumerate(rows[1:], start=2):
        if len(row) < 8:
            continue

        license_str = row[7].strip()
        if not license_str:
            continue

        place_val: Optional[int] = None
        status_val: ResultStatus = ResultStatus.PENDING

        raw_place = row[0].strip().upper()
        if raw_place:
            if raw_place.isdigit():
                place_val = int(raw_place)
                status_val = ResultStatus.OK
            else:
                try:
                    status_val = ResultStatus(raw_place)
                except ValueError:
                    logger.warning(f"Unknown status '{raw_place}' in file {filepath}. Defaulting to PENDING.")
                    status_val = ResultStatus.PENDING

        mark_val = row[6].strip() if len(row) > 6 and row[6].strip() else None

        reac_time_val: Optional[float] = None
        if len(row) > 9 and row[9].strip():
            try:
                reac_time_val = float(row[9].strip())
            except ValueError:
                pass

        try:
            item = ResultItem(
                license=license_str,
                place=place_val,
                status=status_val,
                mark=mark_val,
                reacTime=reac_time_val
            )
            result_items.append(item)
        except ValidationError as e:
            logger.warning(f"Rejected result for athlete (license: {license_str}) in file {filepath}. Reason: {e}")

    if not result_items:
        logger.warning(f"File {filepath} contains no valid results.")
        return None

    try:
        payload = ResultsSyncPayload(
            localEventId=local_event_id,
            localRoundId=local_round_id,
            heatNumber=heat_number,
            wind=wind,
            results=result_items
        )
        logger.info(f"Successfully parsed {filepath}: {len(result_items)} results.")
        return payload
    except ValidationError as e:
        logger.error(f"Failed to create ResultsSyncPayload for {filepath}: {e}")
        return None
