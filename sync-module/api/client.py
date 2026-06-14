import requests
from utils.logger import logger

SEND_RESULT_SENT = "sent"
SEND_RESULT_DISCARD = "discard"
SEND_RESULT_RETRY = "retry"


class SyncApiClient:
    """HTTP client for sending serialized JSON payloads to the backend API."""

    def __init__(self, token: str, base_url: str):
        self.token = token
        self.base_url = base_url

    def update_token(self, token: str):
        """Replace the bearer token used for all subsequent requests."""
        self.token = token

    def send_raw_payload(self, endpoint_path: str, json_str: str) -> str:
        """Send a pre-serialized JSON string to the given endpoint.

        Used by SyncDaemon to flush payloads from the SQLite buffer.

        Returns one of three string constants:
          SEND_RESULT_SENT    — 200/201, payload delivered
          SEND_RESULT_DISCARD — 400/403, permanent failure, drop the payload
          SEND_RESULT_RETRY   — 5xx or network error, transient, keep and retry
        """
        url = f"{self.base_url}{endpoint_path}"
        json_bytes = json_str.encode('utf-8')
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(url, data=json_bytes, headers=headers, timeout=10.0)

            if response.status_code in (200, 201):
                return SEND_RESULT_SENT

            if response.status_code in (400, 403):
                logger.error(
                    f"Permanent error {response.status_code} at {endpoint_path} — payload will be discarded. "
                    f"Response: {response.text}"
                )
                return SEND_RESULT_DISCARD

            logger.error(f"Server error {response.status_code} at {endpoint_path}: {response.text}")
            return SEND_RESULT_RETRY

        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error sending to {endpoint_path}: {e}")
            return SEND_RESULT_RETRY
