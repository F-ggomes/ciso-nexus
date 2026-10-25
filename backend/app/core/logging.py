"""Structured logging with secret redaction."""
from __future__ import annotations

import logging
import re

import structlog

_SECRET_PATTERNS = [
    re.compile(r"(?i)\b(api[_-]?key|token|password|secret|authorization)\s*[=:]\s*\S+"),
    re.compile(r"(?i)\b(bearer)\s+[a-z0-9\-_.=]+"),
]


def _redact(_, __, event_dict):
    for key, value in list(event_dict.items()):
        if isinstance(value, str):
            for pattern in _SECRET_PATTERNS:
                value = pattern.sub(lambda m: f"{m.group(1)}=[REDACTED]", value)
            event_dict[key] = value
    return event_dict


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(level=level, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            _redact,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
    )


def get_logger(name: str):
    return structlog.get_logger(name)
