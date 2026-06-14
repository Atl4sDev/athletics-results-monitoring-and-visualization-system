from database.db_manager import init_db
from gui.app import SyncApp
from utils.logger import logger

def main():
    """Initialize the database and start the GUI event loop."""
    logger.info("Starting Local Sync Module...")

    init_db()

    app = SyncApp()
    app.mainloop()

    logger.info("Sync Agent closed by user.")

if __name__ == "__main__":
    main()
