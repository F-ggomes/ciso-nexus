"""Pre-flight PII redaction applied before any outbound model call.

This is a minimisation control (GDPR Art. 5(1)(c), Art. 25) for prompts that may carry
identifiers from SIEM alerts, identity exports or incident narratives. It is deliberately
conservative: patterns, not NLP. Hashes are stable within a request so the model can still
correlate "the same user" across lines.
"""
from __future__ import annotations

import hashlib
import re

_PATTERNS: dict[str, re.Pattern[str]] = {
    "EMAIL": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    "IPV4": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "NIF_PT": re.compile(r"(?<![\d.:T-])[1-35-9]\d{8}(?![\d.:-])"),  # Portuguese tax number shape
    "NIF_AO": re.compile(r"\b\d{10}[A-Z]{2}\d{3}\b"),  # Angolan NIF shape (individuals)
    "IBAN": re.compile(r"\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b"),
    "PHONE": re.compile(r"(?<![\d:T.-])\+\d{1,3}[\s-]?\d{2,3}(?:[\s-]?\d{2,4}){2,3}\b"),  # international shape only
}


def redact(text: str) -> tuple[str, bool]:
    changed = False

    def _sub(kind: str):
        def inner(m: re.Match[str]) -> str:
            nonlocal changed
            changed = True
            digest = hashlib.sha256(m.group(0).encode()).hexdigest()[:8]
            return f"<{kind}:{digest}>"

        return inner

    for kind, pattern in _PATTERNS.items():
        text = pattern.sub(_sub(kind), text)
    return text, changed
