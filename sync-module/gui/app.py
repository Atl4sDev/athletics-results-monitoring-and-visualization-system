import os
import threading
import customtkinter as ctk
from tkinter import filedialog

from models.schemas import MeetSyncPayload
from parser.ppl_parser import parse_athletes_registry
from parser.cmp_parser import parse_competition_config
from parser.evt_parser import parse_event_schedule
from parser.schedule_builder import build_schedule_payload
from utils.logger import logger

from services.buffer_service import BufferService
from services.sync_daemon import SyncDaemon
from watcher.lif_watcher import LifWatcherService

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class SyncApp(ctk.CTk):
    """Main application window for the Local Sync Module."""

    def __init__(self):
        super().__init__()

        self.title("Local Sync Module")
        self.geometry("600x450")
        self.resizable(False, False)

        self.folder_path = ctk.StringVar()
        self.token = ctk.StringVar()
        self.server_url = ctk.StringVar(value="http://localhost:3000/api/v1")
        self.is_monitoring = False

        self.sync_daemon = None
        self.lif_watcher = None

        self._build_ui()

    def _build_ui(self):
        """Build and arrange all UI widgets."""
        frame_auth = ctk.CTkFrame(self)
        frame_auth.pack(pady=10, padx=20, fill="x")

        lbl_token = ctk.CTkLabel(frame_auth, text="MEET_TOKEN:", font=("Arial", 12, "bold"))
        lbl_token.pack(side="left", padx=10, pady=10)

        self.entry_token = ctk.CTkEntry(frame_auth, textvariable=self.token, width=380, show="*", placeholder_text="Введіть токен змагання", placeholder_text_color="#888888")
        self.entry_token.pack(side="left", padx=10, pady=10)

        frame_url = ctk.CTkFrame(self)
        frame_url.pack(pady=(0, 5), padx=20, fill="x")

        lbl_url = ctk.CTkLabel(frame_url, text="Server URL:", font=("Arial", 12, "bold"))
        lbl_url.pack(side="left", padx=10, pady=8)

        self.entry_url = ctk.CTkEntry(frame_url, textvariable=self.server_url, width=340, placeholder_text="http://localhost:3000/api/v1")
        self.entry_url.pack(side="left", padx=10, pady=8)

        frame_dir = ctk.CTkFrame(self)
        frame_dir.pack(pady=10, padx=20, fill="x")

        lbl_dir = ctk.CTkLabel(frame_dir, text="База LynxPad:", font=("Arial", 12, "bold"))
        lbl_dir.pack(side="left", padx=10, pady=10)

        self.entry_dir = ctk.CTkEntry(frame_dir, textvariable=self.folder_path, width=300, state="readonly")
        self.entry_dir.pack(side="left", padx=10, pady=10)

        btn_choose = ctk.CTkButton(frame_dir, text="Обрати папку", width=100, command=self.choose_directory)
        btn_choose.pack(side="left", padx=10, pady=10)

        frame_controls = ctk.CTkFrame(self, fg_color="transparent")
        frame_controls.pack(pady=10, padx=20, fill="x")

        self.btn_update = ctk.CTkButton(frame_controls, text="Оновити змагання", command=self.run_update, fg_color="#28a745", hover_color="#218838")
        self.btn_update.pack(side="left", expand=True, padx=10)

        self.btn_monitor = ctk.CTkButton(frame_controls, text="Почати моніторинг", command=self.toggle_monitoring, fg_color="#007bff", hover_color="#0056b3")
        self.btn_monitor.pack(side="right", expand=True, padx=10)

        self.textbox = ctk.CTkTextbox(self, width=560, height=200, state="disabled")
        self.textbox.pack(pady=10, padx=20)

        self.log_to_ui("Система готова до роботи. Оберіть папку та введіть токен.")

    def log_to_ui(self, message: str):
        """Append a message to the GUI log textbox in a thread-safe manner."""
        def append_text():
            self.textbox.configure(state="normal")
            self.textbox.insert("end", message + "\n")
            self.textbox.see("end")
            self.textbox.configure(state="disabled")
        self.after(0, append_text)

    def choose_directory(self):
        """Open a directory picker and update the folder path variable."""
        folder = filedialog.askdirectory(title="Оберіть папку з базою LynxPad")
        if folder:
            self.folder_path.set(folder)
            self.log_to_ui(f"Обрано папку: {folder}")

    def _ensure_daemon_running(self, token: str):
        """Start the SyncDaemon on first call; on subsequent calls update the token if it changed."""
        if self.sync_daemon is None:
            base_url = self.server_url.get().strip()
            self.sync_daemon = SyncDaemon(token, base_url, ui_logger_callback=self.log_to_ui)
            self.sync_daemon.start()
            self.log_to_ui("Фоновий демон синхронізації (Strict FIFO Queue) запущено.")
        elif self.sync_daemon.api_client.token != token:
            self.sync_daemon.update_token(token)
            self.log_to_ui("MEET_TOKEN оновлено. Наступні запити будуть надіслані з новим токеном.")

    def run_update(self):
        """Validate inputs, ensure the daemon is running, and spawn the update worker thread."""
        current_token = self.token.get().strip()
        current_folder = self.folder_path.get()

        if not current_token or not current_folder or not self.server_url.get().strip():
            self.log_to_ui("[ПОМИЛКА] Введіть токен, URL сервера та оберіть папку!")
            return

        self.btn_update.configure(state="disabled", text="Обробка...")

        self._ensure_daemon_running(current_token)

        threading.Thread(target=self._update_worker, args=(current_token, current_folder), daemon=True).start()

    def _update_worker(self, token: str, folder: str):
        """Parse all LynxPad files and enqueue the resulting MeetSyncPayload."""
        self.log_to_ui("--- Розпочато процес обробки баз змагання ---")
        logger.info("Manual schedule parse worker triggered.")

        try:
            ppl_path = os.path.join(folder, "lynx.ppl")
            if not os.path.exists(ppl_path):
                self.log_to_ui(f"[ПОМИЛКА] Не знайдено {ppl_path}")
                return

            self.log_to_ui("Парсинг реєстру учасників...")
            athletes = parse_athletes_registry(ppl_path)

            if not athletes:
                self.log_to_ui("[УВАГА] Не знайдено валідних спортсменів з ліцензіями ФЛАУ.")
                return

            cmp_path = os.path.join(folder, "lynx.cmp")
            if not os.path.exists(cmp_path):
                self.log_to_ui(f"[ПОМИЛКА] Не знайдено {cmp_path}")
                return

            self.log_to_ui("Парсинг конфігураційного реєстру дисциплін...")
            cmp_dict = parse_competition_config(cmp_path)

            evt_path = os.path.join(folder, "lynx.evt")
            if not os.path.exists(evt_path):
                self.log_to_ui(f"[ПОМИЛКА] Не знайдено {evt_path}")
                return

            self.log_to_ui("Парсинг забігів та старт-листів...")
            evt_dict = parse_event_schedule(evt_path)

            schedule_items = build_schedule_payload(cmp_dict, evt_dict)

            if not schedule_items:
                self.log_to_ui("[УВАГА] Результат порожній. Бігові види не ідентифіковані.")
                return

            payload = MeetSyncPayload(athletes=athletes, schedule=schedule_items)
            payload_json = payload.model_dump_json()

            BufferService.save_to_buffer("/sync/meet", payload_json)
            self.log_to_ui(f"Пакет ініціалізації ({len(athletes)} атл., {len(schedule_items)} видів) додано до локальної черги.")

        except Exception as e:
            self.log_to_ui(f"[КРИТИЧНА ПОМИЛКА] {str(e)}")
            logger.error(f"Error in manual update loop: {e}", exc_info=True)

        finally:
            self.after(0, lambda: self.btn_update.configure(state="normal", text="Оновити змагання"))

    def toggle_monitoring(self):
        """Toggle the FinishLynx .lif file watcher on or off."""
        current_token = self.token.get().strip()
        current_folder = self.folder_path.get()

        if not current_token or not current_folder or not self.server_url.get().strip():
            self.log_to_ui("[ПОМИЛКА] Оберіть папку змагань, введіть MEET_TOKEN та URL сервера!")
            return

        self._ensure_daemon_running(current_token)

        if not self.is_monitoring:
            try:
                self.lif_watcher = LifWatcherService(current_folder, ui_logger_callback=self.log_to_ui)
                self.lif_watcher.start()

                self.is_monitoring = True
                self.btn_monitor.configure(text="Зупинити моніторинг", fg_color="#dc3545", hover_color="#c82333")
                self.log_to_ui(f"Автоматичний моніторинг файлів .lif у папці {os.path.basename(current_folder)} ЗАПУЩЕНО.")
                logger.info("Watchdog file monitoring service activated by user.")
            except Exception as e:
                self.log_to_ui(f"[ПОМИЛКА] Не вдалося ініціалізувати Watchdog: {e}")
        else:
            if self.lif_watcher:
                self.lif_watcher.stop()
                self.lif_watcher = None

            self.is_monitoring = False
            self.btn_monitor.configure(text="Почати моніторинг", fg_color="#007bff", hover_color="#0056b3")
            self.log_to_ui("Моніторинг файлів результатів успішно ЗУПИНЕНО.")
            logger.info("Watchdog file monitoring service deactivated by user.")
