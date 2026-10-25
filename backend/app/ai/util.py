"""Small helpers with no heavy imports (safe for unit tests)."""
from __future__ import annotations

import json
from typing import Any


def parse_json(text: str) -> dict[str, Any]:
    """Tolerant JSON extraction for json_mode outputs (handles code fences and leading prose)."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):]
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1]) if start >= 0 and end > start else {}
