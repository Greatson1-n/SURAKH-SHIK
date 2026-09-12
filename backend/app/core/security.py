import os
import hmac
import hashlib
import json
import base64
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# --- Password Hashing (PBKDF2-HMAC-SHA256 - FIPS 140-2 Compliant) ---

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with 100,000 iterations of SHA-256 and random 16-byte salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    # Format: salt_hex$key_hex
    return f"{salt.hex()}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored salt and key."""
    try:
        salt_hex, key_hex = hashed.split("$")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        actual_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(actual_key, expected_key)
    except Exception:
        return False

# --- Cryptographic Envelope Encryption (AES-256-GCM) ---

def generate_dek() -> bytes:
    """Generate a 256-bit (32-byte) Data Encryption Key (DEK)."""
    return AESGCM.generate_key(bit_length=256)

def encrypt_bytes(data: bytes, key: bytes, associated_data: Optional[bytes] = None) -> Dict[str, str]:
    """
    Encrypt data with AES-256-GCM.
    Returns nonce and ciphertext (which includes the 16-byte authentication tag).
    """
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, data, associated_data)
    return {
        "nonce_b64": base64.b64encode(nonce).decode("utf-8"),
        "ciphertext_b64": base64.b64encode(ciphertext).decode("utf-8"),
    }

def decrypt_bytes(ciphertext_b64: str, nonce_b64: str, key: bytes, associated_data: Optional[bytes] = None) -> bytes:
    """Decrypt and authenticate ciphertext using AES-256-GCM."""
    aesgcm = AESGCM(key)
    nonce = base64.b64decode(nonce_b64)
    ciphertext = base64.b64decode(ciphertext_b64)
    return aesgcm.decrypt(nonce, ciphertext, associated_data)

# --- SHA-256 Hashing ---

def compute_sha256(data: bytes) -> str:
    """Compute standard SHA-256 hexadecimal digest."""
    return hashlib.sha256(data).hexdigest()

# --- JWT Access Tokens ---

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
