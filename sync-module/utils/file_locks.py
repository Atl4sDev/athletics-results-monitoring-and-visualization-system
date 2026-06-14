import os
import time
from typing import List
from utils.logger import logger

def read_lynx_file_safely(filepath: str, max_retries: int = 5) -> List[str]:
    """Read a Lynx ecosystem file (UTF-16 LE BOM) with exponential backoff.

    Retries on PermissionError to handle OS-level file locks held by FinishLynx
    during camera processing.

    :param filepath: Full path to the file (.ppl, .evt, .lif, etc.)
    :param max_retries: Maximum number of read attempts.
    :return: List of non-empty text lines with whitespace stripped.
    """
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return []

    for attempt in range(max_retries):
        try:
            # Python's 'utf-16' codec automatically detects and strips the BOM (\xff\xfe)
            with open(filepath, 'r', encoding='utf-16') as f:
                lines = f.read().splitlines()
                cleaned_lines = [line for line in lines if line.strip()]

                if attempt > 0:
                    logger.info(f"Successfully read {filepath} on attempt {attempt + 1}.")

                return cleaned_lines

        except PermissionError:
            # Exponential backoff: 0.1s, 0.2s, 0.4s, 0.8s, 1.6s
            wait_time = 0.1 * (2 ** attempt)
            logger.warning(f"File {filepath} is locked. Attempt {attempt + 1}/{max_retries}. Waiting {wait_time}s...")
            time.sleep(wait_time)

        except UnicodeError as e:
            logger.error(f"Encoding error in {filepath}. Expected UTF-16. Details: {e}")
            return []

        except Exception as e:
            logger.error(f"Unexpected error reading {filepath}: {e}")
            return []

    logger.critical(f"CRITICAL: Failed to read {filepath} after {max_retries} attempts due to OS file lock.")
    return []
