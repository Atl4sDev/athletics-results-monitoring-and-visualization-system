import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logger():
    """Configure and return the application-wide logger with file and console handlers."""
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logger = logging.getLogger("SyncAgent")
    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(module)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Rotating file handler: 5 MB per file, keep up to 3 backups
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "sync_agent.log"),
        maxBytes=5*1024*1024,
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(formatter)

    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger

logger = setup_logger()
