import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
VAULT_DIR = DATA_DIR / "vault"
PHOTOS_DIR = DATA_DIR / "photos"
DB_PATH = DATA_DIR / "surakh_shik.db"
REGISTRY_PATH = DATA_DIR / "surakh_persistent_registry.json"

# Security Settings
JWT_SECRET = os.getenv("SURAKH_JWT_SECRET", "SURAKH-SHIK-MHA-NCRB-SOVEREIGN-KEY-2026-X99Q")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hour operational shift

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
VAULT_DIR.mkdir(parents=True, exist_ok=True)
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

# Master Admin Pre-Seeded Identity (Strictly configured as specified)
ADMIN_USER_ID = "ADM-IT-SURAKH"
ADMIN_RAW_PASS = "A0M-1T-SRKSK"
ADMIN_PHOTO_NAME = "admin_photo.jpg"
