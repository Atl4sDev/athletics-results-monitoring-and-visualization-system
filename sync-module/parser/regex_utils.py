import re
from typing import Dict, Any
from models.enums import AgeCategory
from utils.logger import logger

def normalize_discipline_name(raw_name: str) -> Dict[str, Any]:
    """Parse a raw discipline name from .evt (e.g. '110 м зб 0840 Ч-U20')
    and return a standardized disciplineCode (e.g. '110H') and ageCategory.

    Recognized Ukrainian shorthand specifiers (matched as substrings, exactly
    as they appear in real .evt data — no slashes):
    - 'зб' → H  (Hurdles)
    - 'зп' → SC (Steeplechase)
    - 'сх' → W  (Race Walking)
    """
    normalized = raw_name.lower().strip()

    result = {
        "disciplineCode": "UNKNOWN",
        "ageCategory": AgeCategory.SENIOR
    }

    # Match the first number, optionally followed by 'м' (metres) or 'км' (kilometres)
    distance_match = re.search(r'(\d+)\s*(м|км)?', normalized)
    if not distance_match:
        logger.warning(f"Could not find distance in discipline name: '{raw_name}'")
        return result

    distance_value = int(distance_match.group(1))
    unit = distance_match.group(2)

    if unit == 'км':
        distance_value *= 1000

    base_code = str(distance_value)

    # \b does not work well with '/', so substring matching is used instead
    suffix = ""
    if 'сх' in normalized:
        suffix = "W"
    elif 'зб' in normalized:
        suffix = "H"
    elif 'зп' in normalized:
        suffix = "SC"

    result["disciplineCode"] = f"{base_code}{suffix}"

    age_match = re.search(r'(u\d{2})', normalized)
    if age_match:
        age_str = age_match.group(1).upper()
        try:
            result["ageCategory"] = AgeCategory(age_str)
        except ValueError:
            logger.warning(f"Unknown age category '{age_str}' in '{raw_name}'. Defaulting to SENIOR.")
            result["ageCategory"] = AgeCategory.SENIOR

    elif re.search(r'-(м|ж)\d{2}', normalized):
        result["ageCategory"] = AgeCategory.MASTERS

    return result


if __name__ == "__main__":
    test_cases = [
        "100 м Ч",
        "110 м зб 0840 Ч-U20",
        "Спортивна ходьба 10000 м Ж",
        "сх 20 км Ч",
        "3000 м зп Ж-U18",
        "400 м зб Ж-U23",
        "1500 м Ч-М45"
    ]

    print("--- REGEX ENGINE TEST ---")
    for tc in test_cases:
        res = normalize_discipline_name(tc)
        print(f"[{tc}] -> Code: {res['disciplineCode']}, Age: {res['ageCategory'].value}")
