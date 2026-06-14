import re
from typing import Dict, Any
from utils.file_locks import read_lynx_file_safely
from utils.logger import logger

# Event property pattern: \Event\Info\15\Gender:String,1=F -> groups: (15, Gender, F)
EVENT_REGEX = re.compile(r"^\\Event\\Info\\(\d+)\\([^:\\]+):.*?=(.*)$")

# Round property pattern: \Event\Info\14\Round\1\Name:String,1=Final -> groups: (14, 1, Name, Final)
ROUND_REGEX = re.compile(r"^\\Event\\Info\\(\d+)\\Round\\(\d+)\\([^:\\]+):.*?=(.*)$")

def parse_competition_config(filepath: str) -> Dict[str, Any]:
    """Parse a .cmp configuration file (key-value structure).

    Builds a hierarchical dictionary of events and their rounds.
    Discards field events, relays, and multi-events (out of MVP scope).
    """
    lines = read_lynx_file_safely(filepath)
    if not lines:
        return {}

    events_config: Dict[str, Any] = {}

    for line_number, line in enumerate(lines, start=1):
        line = line.strip()
        if not line or line.startswith(';'):
            continue

        round_match = ROUND_REGEX.match(line)
        if round_match:
            event_id, round_id, key, value = round_match.groups()

            if event_id not in events_config:
                events_config[event_id] = {'rounds': {}}
            if 'rounds' not in events_config[event_id]:
                events_config[event_id]['rounds'] = {}
            if round_id not in events_config[event_id]['rounds']:
                events_config[event_id]['rounds'][round_id] = {}

            events_config[event_id]['rounds'][round_id][key] = value
            continue

        event_match = EVENT_REGEX.match(line)
        if event_match:
            event_id, key, value = event_match.groups()

            if event_id not in events_config:
                events_config[event_id] = {'rounds': {}}

            events_config[event_id][key] = value
            continue

    valid_events = {}

    for event_id, event_data in events_config.items():
        event_type = event_data.get('Type', '')
        is_relay = event_data.get('Relay', '0')
        multi_event = event_data.get('MultiEventType', '')

        if event_type == 'Field' or is_relay == '1' or multi_event != '':
            logger.debug(f"Filtered out EventID={event_id} (Type: {event_type}, Relay: {is_relay}, Multi: {multi_event})")
            continue

        if not event_data.get('rounds'):
            logger.debug(f"Filtered out EventID={event_id} (no rounds found)")
            continue

        valid_events[event_id] = event_data

    logger.info(f".cmp parsing complete. Found {len(valid_events)} valid running events.")
    return valid_events
