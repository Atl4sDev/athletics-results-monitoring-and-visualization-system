import sqlite3
from typing import List, Dict, Tuple
from database.db_manager import get_connection
from utils.logger import logger

class BufferService:
    """Static service for persisting and retrieving payloads from the SQLite FIFO queue."""

    @staticmethod
    def save_to_buffer(endpoint: str, payload_json: str):
        """Insert a serialized JSON payload into the local queue for deferred delivery."""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO payload_queue (endpoint, payload, status) VALUES (?, ?, ?)",
                (endpoint, payload_json, 'pending')
            )
            conn.commit()
            conn.close()
            logger.warning(f"Payload for {endpoint} saved to local SQLite buffer.")
        except Exception as e:
            logger.error(f"Failed to save payload to buffer: {e}")

    @staticmethod
    def get_unsent_payloads() -> List[Tuple[int, str, str]]:
        """Return all pending payloads ordered by insertion time (FIFO).

        Returns a list of (id, endpoint, payload_json) tuples.
        """
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, endpoint, payload FROM payload_queue WHERE status = 'pending' ORDER BY id ASC"
            )
            rows = cursor.fetchall()
            conn.close()
            return rows
        except Exception as e:
            logger.error(f"Failed to retrieve payloads from buffer: {e}")
            return []

    @staticmethod
    def mark_as_sent(payload_id: int):
        """Delete a successfully delivered payload from the queue."""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM payload_queue WHERE id = ?", (payload_id,))
            conn.commit()
            conn.close()
            logger.info(f"Buffered payload #{payload_id} successfully sent and removed from queue.")
        except Exception as e:
            logger.error(f"Failed to mark payload #{payload_id} as sent: {e}")
