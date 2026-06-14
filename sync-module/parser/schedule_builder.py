from typing import Dict, Any, List
from pydantic import ValidationError

from models.schemas import ScheduleItem
from models.enums import Gender
from utils.logger import logger

def build_schedule_payload(cmp_dict: Dict[str, Any], evt_dict: Dict[str, Dict[str, Any]]) -> List[ScheduleItem]:
    """Merge .cmp metadata with .evt start lists to produce final ScheduleItem DTOs.

    :param cmp_dict: Discipline metadata from parse_competition_config.
    :param evt_dict: Start list data from parse_event_schedule.
    :return: List of validated ScheduleItem objects.
    """
    schedule_payload: List[ScheduleItem] = []

    for key, evt_data in evt_dict.items():
        event_id = evt_data["localEventId"]
        round_id = evt_data["localRoundId"]

        if event_id not in cmp_dict:
            logger.debug(f"Skipping {key}: EventID {event_id} not found in .cmp (likely a field event or relay).")
            continue

        cmp_event = cmp_dict[event_id]

        if round_id not in cmp_event.get("rounds", {}):
            logger.warning(f"Skipping {key}: RoundID {round_id} not found in .cmp config for EventID {event_id}.")
            continue

        cmp_round = cmp_event["rounds"][round_id]

        round_name = cmp_round.get("Name", "Забіг").strip()

        # Map .cmp gender codes ('M', 'F', 'X') to the Gender enum
        raw_gender = cmp_event.get("Gender", "M").upper()
        if raw_gender == "F":
            mapped_gender = Gender.FEMALE
        elif raw_gender == "M":
            mapped_gender = Gender.MALE
        else:
            mapped_gender = Gender.MIXED

        date_str = cmp_round.get("Date", "").strip()
        raw_time_str = cmp_round.get("Time", "").strip()

        # Zero-pad single-digit hours: "9:15:00" → "09:15:00"
        time_str = ""
        if raw_time_str:
            time_parts = raw_time_str.split(":")
            if len(time_parts) == 3:
                try:
                    time_str = f"{int(time_parts[0]):02d}:{time_parts[1]}:{time_parts[2]}"
                except ValueError:
                    time_str = raw_time_str
            else:
                time_str = raw_time_str

        try:
            schedule_item = ScheduleItem(
                localEventId=event_id,
                localRoundId=round_id,
                disciplineCode=evt_data["disciplineCode"],
                eventName=evt_data["eventName"],
                gender=mapped_gender,
                ageCategory=evt_data["ageCategory"],
                roundName=round_name,
                date=date_str,
                time=time_str,
                heats=evt_data["heats_data"]
            )
            schedule_payload.append(schedule_item)

        except ValidationError as e:
            error_msgs = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
            logger.error(
                f"Validation error for schedule item {key} ({evt_data['eventName']}). "
                f"Reasons: {error_msgs}. Check date ({date_str}) and time ({time_str}) formats."
            )

    logger.info(f"Schedule assembly complete. Ready to send: {len(schedule_payload)} ScheduleItem objects.")
    return schedule_payload
