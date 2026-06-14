import threading
import time
from typing import Optional, Callable

from api.client import SyncApiClient, SEND_RESULT_SENT, SEND_RESULT_DISCARD
from services.buffer_service import BufferService
from utils.logger import logger

class SyncDaemon:
    """Background thread that drains the SQLite payload queue in strict FIFO order."""

    def __init__(self, token: str, base_url: str, ui_logger_callback: Optional[Callable[[str], None]] = None):
        """
        :param token: Competition API token.
        :param base_url: Backend base URL (e.g. http://localhost:3000).
        :param ui_logger_callback: Optional callback for forwarding messages to the GUI.
        """
        self.api_client = SyncApiClient(token, base_url)
        self._stop_event = threading.Event()
        self._is_online = True
        self._retry_after: float = 0.0
        self._thread: Optional[threading.Thread] = None
        self.ui_logger = ui_logger_callback

    def log(self, message: str, is_warning: bool = False):
        """Forward a message to both the file logger and the GUI callback."""
        if is_warning:
            logger.warning(message)
        else:
            logger.info(message)

        if self.ui_logger:
            self.ui_logger(message)

    def update_token(self, token: str):
        """Update the bearer token used by the HTTP client for all future requests."""
        self.api_client.update_token(token)

    def start(self):
        """Start the daemon thread; idempotent if already running."""
        if self._thread is not None and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        self.log("Демон відправки черги (Consumer) працює.")

    def stop(self):
        """Signal the daemon to stop and wait for the thread to finish."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=3.0)

    def _run_loop(self):
        """Poll the buffer every 2 seconds and send payloads in FIFO order.

        Stops sending immediately on the first failure to preserve delivery order.
        """
        while not self._stop_event.is_set():
            self._stop_event.wait(2.0)

            if self._stop_event.is_set():
                break

            if time.time() < self._retry_after:
                continue

            payloads = BufferService.get_unsent_payloads()
            if not payloads:
                continue

            for payload_id, endpoint, payload_json in payloads:
                result = self.api_client.send_raw_payload(endpoint, payload_json)

                if result == SEND_RESULT_SENT:
                    BufferService.mark_as_sent(payload_id)

                    if not self._is_online:
                        self._is_online = True
                        self.log("Зв'язок із сервером відновлено. Чергу розблоковано.")

                    item_type = "Старт-листи" if "meet" in endpoint else "Результати"
                    self.log(f"{item_type} успішно відправлено на сервер.")

                elif result == SEND_RESULT_DISCARD:
                    BufferService.mark_as_sent(payload_id)
                    item_type = "Старт-листи" if "meet" in endpoint else "Результати"
                    self.log(
                        f"УВАГА: {item_type} відхилено сервером (400/403) — пакет видалено з черги. "
                        "Перевірте токен або статус змагання.",
                        is_warning=True
                    )

                else:
                    if self._is_online:
                        self._is_online = False
                        self.log("Втрачено зв'язок. Перехід у режим очікування (15 с).", is_warning=True)
                    self._retry_after = time.time() + 15.0
                    break
