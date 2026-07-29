"""App configuration — single source of truth for paths, ports, and settings."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
FRONTEND_DIR = BASE_DIR / "frontend"

# Database
DB_PATH = DATA_DIR / "wrestling.db"
DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"
BACKUP_DIR = DATA_DIR / "backups"

# Server
HOST = "0.0.0.0"
PORT = 8000
DEV_RELOAD = True

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
