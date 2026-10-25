"""Agent catalogue (lazy to keep pure-logic imports light)."""
from __future__ import annotations

__all__ = ["CISOCopilot", "EvidenceMapper", "IncidentClassifier", "RiskAnalyst", "TPRMAnalyst"]
_MAP = {"CISOCopilot": "ciso_copilot", "EvidenceMapper": "evidence_mapper", "IncidentClassifier": "incident_classifier",
        "RiskAnalyst": "risk_analyst", "TPRMAnalyst": "tprm_analyst"}


def __getattr__(name: str):
    if name in _MAP:
        import importlib

        return getattr(importlib.import_module(f"app.ai.agents.{_MAP[name]}"), name)
    raise AttributeError(name)
