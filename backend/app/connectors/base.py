"""Connector contracts.

Three families, three capability interfaces:
  GRCConnector       - system of record for risks, controls, vendors, incidents (bi-directional)
  SecurityConnector  - produces findings/alerts and evidence artefacts (read-only)
  ITSMConnector      - creates and updates tickets, sends notifications (write)

A connector declares which capabilities it implements; the registry and services only call what is declared.
All HTTP goes through `BaseHTTP` for consistent timeouts, retries and TLS handling.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, ClassVar, Literal

import httpx

Category = Literal["grc", "security", "itsm", "identity"]


@dataclass
class HealthStatus:
    ok: bool
    detail: str = ""
    version: str | None = None


@dataclass
class Finding:
    """Normalised alert / vulnerability / misconfiguration."""

    source: str
    source_ref: str
    title: str
    severity: str  # low | medium | high | critical
    detected_at: datetime
    asset: str | None = None
    description: str = ""
    rule_id: str | None = None
    tags: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceArtefact:
    source: str
    source_ref: str
    title: str
    payload: dict[str, Any]
    result: str = "info"  # pass | fail | info
    candidate_control_refs: list[str] = field(default_factory=list)
    collected_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def sha256(self) -> str:
        return hashlib.sha256(json.dumps(self.payload, sort_keys=True, default=str).encode()).hexdigest()


RecordKind = Literal["risk", "control", "vendor", "incident", "framework"]


@dataclass
class ExternalRecord:
    """Generic record from a GRC system: risk, control, vendor, incident."""

    kind: RecordKind
    external_id: str
    data: dict[str, Any]


class BaseHTTP:
    """Shared httpx client with retries. Subclasses set base_url/auth."""

    timeout: ClassVar[float] = 30.0

    def __init__(self, base_url: str, headers: dict[str, str] | None = None, auth: Any = None, verify: bool = True):
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), headers=headers or {}, auth=auth,
                                         verify=verify, timeout=self.timeout)

    async def request(self, method: str, path: str, attempts: int = 3, **kw) -> httpx.Response:
        """Request with exponential backoff on transport errors and 429/503."""
        delay = 1.0
        for attempt in range(1, attempts + 1):
            try:
                resp = await self._client.request(method, path, **kw)
                if resp.status_code in (429, 503) and attempt < attempts:
                    raise httpx.TransportError(f"retryable status {resp.status_code}")
                resp.raise_for_status()
                return resp
            except httpx.TransportError:
                if attempt == attempts:
                    raise
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8.0)
        raise RuntimeError("unreachable")

    async def get_json(self, path: str, **kw) -> Any:
        return (await self.request("GET", path, **kw)).json()

    async def post_json(self, path: str, body: Any, **kw) -> Any:
        return (await self.request("POST", path, json=body, **kw)).json()

    async def aclose(self) -> None:
        await self._client.aclose()


class Connector(ABC):
    """Base connector. `cfg` holds per-organization settings and secrets; `env()` falls back to Settings."""

    key: ClassVar[str]
    category: ClassVar[Category]
    display_name: ClassVar[str]
    capabilities: ClassVar[set[str]] = set()
    config_schema: ClassVar[dict[str, str]] = {}  # field -> description, used by the AI config assistant

    def __init__(self, cfg: dict[str, Any] | None = None) -> None:
        # cfg["_env_fallback"]: allow environment credentials (operator organisation only); cfg["_enabled"]: admin switch
        self.cfg = cfg if cfg is not None else {"_env_fallback": True}

    def enabled(self) -> bool:
        return bool(self.cfg.get("_enabled", True))

    def opt(self, name: str, env_attr: str | None = None, default: Any = None) -> Any:
        """Read an option from the per-org config, else from environment settings."""
        if name in self.cfg and self.cfg[name] not in (None, ""):
            return self.cfg[name]
        if env_attr and self.cfg.get("_env_fallback", False):
            from app.core.config import get_settings

            value = getattr(get_settings(), env_attr, None)
            if value is not None and hasattr(value, "get_secret_value"):
                return value.get_secret_value()
            if value not in (None, ""):
                return value
        return default

    @abstractmethod
    def configured(self) -> bool: ...

    @abstractmethod
    async def health(self) -> HealthStatus: ...


class SecurityConnector(Connector):
    category = "security"

    async def findings(self, since: datetime | None = None, limit: int = 500) -> list[Finding]:
        raise NotImplementedError

    async def evidence(self) -> list[EvidenceArtefact]:
        raise NotImplementedError


class GRCConnector(Connector):
    category = "grc"

    async def pull(self, kind: str, since: datetime | None = None) -> list[ExternalRecord]:
        raise NotImplementedError

    async def push(self, kind: str, data: dict[str, Any], external_id: str | None = None) -> str:
        """Create or update; returns external id."""
        raise NotImplementedError


class ITSMConnector(Connector):
    category = "itsm"

    async def create_ticket(self, title: str, description: str, severity: str, labels: list[str] | None = None) -> str:
        raise NotImplementedError

    async def notify(self, title: str, text: str, severity: str = "info") -> None:
        raise NotImplementedError
