import sqlite3
import os
from utils.logger import logger

DB_FILE = "buffer.db"

def init_db():
    """Initialize the local SQLite database and create the payload queue table if it does not exist."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payload_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL,
                payload TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("SQLite database initialized successfully. Table 'payload_queue' is ready.")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {e}")

def get_connection():
    """Return a new SQLite connection to the buffer database."""
    return sqlite3.connect(DB_FILE)
