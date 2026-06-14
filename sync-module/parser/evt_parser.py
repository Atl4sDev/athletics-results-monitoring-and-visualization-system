import csv
from typing import Dict, Any, List
from pydantic import ValidationError

from utils.file_locks import read_lynx_file_safely
from models.schemas import Heat, Entry
from parser.regex_utils import normalize_discipline_name
from utils.logger import logger

def parse_event_schedule(filepath: str) -> Dict[str, Dict[str, Any]]:
    """Parse a start list file (.evt) using a state machine pattern.

    Returns a structured dictionary keyed by 'event_id-round_id', where each value
    contains discipline metadata and a list of heats.
    """
    lines = read_lynx_file_safely(filepath)
    if not lines:
        return {}

    data_lines = [line for line in lines if not line.startswith(';')]
    reader = csv.reader(data_lines)

    schedule_dict: Dict[str, Dict[str, Any]] = {}
    current_key = None
    current_heat_number = None
    current_entries: List[Entry] = []

    for line_number, row in enumerate(reader, start=1):
        # Non-empty first column → header row: event number, round number, heat number, event name
        if row[0].strip():
            if current_key and current_heat_number is not None:
                _save_heat(schedule_dict, current_key, current_heat_number, current_entries)

            try:
                event_id = row[0].strip()
                round_id = row[1].strip()
                current_heat_number = int(row[2].strip())
                raw_event_name = row[3].strip()

                current_key = f"{event_id}-{round_id}"

                if current_key not in schedule_dict:
                    norm_data = normalize_discipline_name(raw_event_name)

                    schedule_dict[current_key] = {
                        "localEventId": event_id,
                        "localRoundId": round_id,
                        "eventName": raw_event_name,
                        "disciplineCode": norm_data["disciplineCode"],
                        "ageCategory": norm_data["ageCategory"],
                        "heats_data": []
                    }

                current_entries = []

            except (IndexError, ValueError) as e:
                logger.error(f"Failed to parse .evt header at line {line_number}: {row}. Details: {e}")
                current_key = None

        # Empty first column → athlete entry row: , ID, lane, last name, first name, affiliation, license
        elif not row[0].strip() and current_key is not None:
            if len(row) < 7:
                continue

            try:
                bib_str = row[1].strip()
                lane_str = row[2].strip()
                team_str = row[5].strip()
                license_str = row[6].strip()

                entry = Entry(
                    license=license_str,
                    lane=int(lane_str) if lane_str else 0,
                    bibNumber=bib_str,
                    team=team_str if team_str else "Особисто"
                )
                current_entries.append(entry)
            except ValidationError as e:
                logger.warning(f"Rejected entry (license: {row[6]}) in heat {current_key}-{current_heat_number}. Reason: {e}")
            except ValueError:
                logger.warning(f"Invalid numeric data (Bib/Lane) at line {line_number}: {row}")

    if current_key and current_heat_number is not None and current_entries:
        _save_heat(schedule_dict, current_key, current_heat_number, current_entries)

    logger.info(f".evt parsing complete. Found schedule for {len(schedule_dict)} event/round combinations.")
    return schedule_dict

def _save_heat(schedule_dict: Dict, key: str, heat_number: int, entries: List[Entry]):
    """Append a completed heat to the schedule dictionary."""
    try:
        heat = Heat(heatNumber=heat_number, entries=entries)
        schedule_dict[key]["heats_data"].append(heat)
    except ValidationError as e:
        logger.error(f"Failed to create Heat {heat_number} for {key}: {e}")
