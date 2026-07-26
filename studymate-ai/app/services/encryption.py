"""
app/services/encryption.py
--------------------------
AES-256-GCM encryption for MCP tokens.
Tokens are NEVER stored in plaintext.
"""

import base64
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key() -> bytes:
    """Derive a 32-byte AES key from SECRET_KEY setting."""
    from app.config import settings
    raw = settings.SECRET_KEY.encode()
    # Pad / truncate to exactly 32 bytes
    return raw[:32].ljust(32, b"\x00")


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext token string. Returns base64-encoded ciphertext."""
    if not plaintext:
        return ""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)                       # 96-bit nonce
    data = plaintext.encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, data, None)
    payload = {"n": base64.b64encode(nonce).decode(), "c": base64.b64encode(ciphertext).decode()}
    return base64.b64encode(json.dumps(payload).encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """Decrypt a previously encrypted token. Returns plaintext string."""
    if not encrypted:
        return ""
    try:
        key = _get_key()
        aesgcm = AESGCM(key)
        payload = json.loads(base64.b64decode(encrypted).decode())
        nonce = base64.b64decode(payload["n"])
        ciphertext = base64.b64decode(payload["c"])
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception:
        return ""
