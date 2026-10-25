"""Encryption at rest for per-organization connector secrets (Fernet, AES-128-CBC + HMAC).

The key is derived from NEXUS_ENCRYPTION_KEY (preferred, a urlsafe base64 32-byte key) or, for
development only, from SECRET_KEY. Rotate by setting a new key and re-encrypting via the admin CLI.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Any

from cryptography.fernet import Fernet

from app.core.config import get_settings


def _fernet() -> Fernet:
    raw = os.getenv("NEXUS_ENCRYPTION_KEY")
    if raw:
        return Fernet(raw.encode())
    derived = hashlib.sha256(get_settings().secret_key.get_secret_value().encode()).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def encrypt_secrets(secrets: dict[str, Any]) -> str:
    return _fernet().encrypt(json.dumps(secrets).encode()).decode()


def decrypt_secrets(blob: str | None) -> dict[str, Any]:
    if not blob:
        return {}
    return json.loads(_fernet().decrypt(blob.encode()).decode())
