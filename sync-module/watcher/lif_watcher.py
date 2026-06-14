import os
import time
from typing import Dict, Callable, Optional
from watchdog.events import FileSystemEventHandler, FileSystemEvent
from watchdog.observers import Observer

from parser.lif_parser import parse_lif_file
from services.buffer_service import BufferService
from utils.logger import logger

class LifEventHandler(FileSystemEventHandler):
    """Watchdog event handler that parses .lif files on modification."""

    def __init__(self, ui_logger_callback: Optional[Callable[[str], None]] = None):
        super().__init__()
        self.debounce_interval = 0.5
        self._last_processed_time: Dict[str, float] = {}
        self._last_processed_size: Dict[str, int] = {}
        self.ui_logger = ui_logger_callback

    def _process_file(self, filepath: str, force: bool = False):
        """Parse a .lif file and push the result to the buffer.

        Skips processing if the file has not changed since the last parse
        (debounce by time and file size). Set force=True to bypass debounce.
        """
        current_time = time.time()
        last_time = self._last_processed_time.get(filepath, 0.0)

        try:
            current_size = os.path.getsize(filepath)
        except OSError:
            return

        if not force:
            last_size = self._last_processed_size.get(filepath, -1)
            if (current_time - last_time < self.debounce_interval) or (current_size == last_size):
                return

        self._last_processed_time[filepath] = current_time
        self._last_processed_size[filepath] = current_size

        payload = parse_lif_file(filepath)

        if payload:
            payload_json = payload.model_dump_json()
            BufferService.save_to_buffer("/sync/results", payload_json)

            msg = f"Парсер: Результати з {os.path.basename(filepath)} додано до черги."
            logger.info(msg)
            if self.ui_logger:
                self.ui_logger(msg)

    # on_created is intentionally omitted: on Windows, file creation always triggers
    # an immediate on_modified, which caused duplicate parsing.
    def on_modified(self, event: FileSystemEvent):
        if not event.is_directory and event.src_path.lower().endswith('.lif'):
            self._process_file(event.src_path)

class LifWatcherService:
    """Manages a watchdog observer that monitors a folder for .lif file changes."""

    def __init__(self, folder_path: str, ui_logger_callback: Optional[Callable[[str], None]] = None):
        self.folder_path = folder_path
        self.ui_logger = ui_logger_callback
        self.observer = Observer()
        self.handler = LifEventHandler(ui_logger_callback)
        self._is_running = False

    def scan_existing_files(self):
        """Parse all existing .lif files in the folder before the watchdog starts."""
        if not os.path.exists(self.folder_path):
            return

        lif_files = [f for f in os.listdir(self.folder_path) if f.lower().endswith('.lif')]
        if lif_files:
            msg = f"Знайдено {len(lif_files)} .lif файлів у папці. Відправка до черги..."
            logger.info(msg)
            if self.ui_logger:
                self.ui_logger(msg)

            for file_name in lif_files:
                full_path = os.path.join(self.folder_path, file_name)
                self.handler._process_file(full_path, force=True)

    def start(self):
        """Schedule the handler and start the watchdog observer thread."""
        if not self._is_running:
            if not os.path.exists(self.folder_path):
                logger.error(f"Folder {self.folder_path} does not exist.")
                return

            self.scan_existing_files()

            self.observer.schedule(self.handler, self.folder_path, recursive=False)
            self.observer.daemon = True
            self.observer.start()
            self._is_running = True

    def stop(self):
        """Stop the watchdog observer and wait for it to finish."""
        if self._is_running:
            self.observer.stop()
            self.observer.join()
            self._is_running = False
