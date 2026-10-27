"""Risk level calculation aligned with ISO/IEC 27005:2022 (qualitative 5x5) and the organization's appetite.

Appetite is stored on ISMSScope.risk_appetite:
  accept_below: scores strictly below are 'low' and may be accepted by the risk owner
  escalate_at:  scores at or above are 'critical' and require CISO + management decision
Between the two: 'medium' (< midpoint) or 'high'.
Residual score = residual_likelihood x residual_impact when both set; control effectiveness can
be applied as a reduction factor (0-1) to likelihood when treatment is 'mitigate'.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


DEFAULT_APPETITE = {"accept_below": 6, "escalate_at": 15, "matrix": 5}


def appetite_for(db: Session, org_id: str) -> dict:
    from app.db.models import ISMSScope

    scope = db.query(ISMSScope).filter_by(org_id=org_id).order_by(ISMSScope.created_at.desc()).first()
    return {**DEFAULT_APPETITE, **(scope.risk_appetite if scope and scope.risk_appetite else {})}


def level_for(score: int, appetite: dict) -> str:
    if score >= appetite["escalate_at"]:
        return "critical"
    if score < appetite["accept_below"]:
        return "low"
    mid = (appetite["accept_below"] + appetite["escalate_at"]) / 2
    return "medium" if score < mid else "high"


def clamp(v: int | None, lo: int = 1, hi: int = 5) -> int:
    return max(lo, min(hi, int(v or lo)))


def compute(risk: Any, appetite: dict, control_effectiveness: float | None = None) -> Any:
    risk.likelihood = clamp(risk.likelihood)
    risk.impact = clamp(risk.impact)
    risk.inherent_score = risk.likelihood * risk.impact
    if risk.residual_likelihood is None and control_effectiveness is not None and risk.treatment == "mitigate":
        risk.residual_likelihood = clamp(round(risk.likelihood * (1 - control_effectiveness)))
        risk.residual_impact = risk.residual_impact or risk.impact
    if risk.residual_likelihood and risk.residual_impact:
        risk.residual_score = clamp(risk.residual_likelihood) * clamp(risk.residual_impact)
    effective = risk.residual_score or risk.inherent_score
    risk.level = level_for(effective, appetite)
    if risk.review_at is None:
        months = {"critical": 3, "high": 6, "medium": 12, "low": 12}[risk.level]
        risk.review_at = datetime.now(UTC) + timedelta(days=30 * months)
    return risk


def acceptance_allowed(risk: Any, appetite: dict, role: str) -> tuple[bool, str]:
    score = risk.residual_score or risk.inherent_score
    if score >= appetite["escalate_at"]:
        return role == "ciso", "Scores at or above the escalation threshold require the CISO and management approval"
    if score >= appetite["accept_below"]:
        return role in ("ciso",), "Medium and high risks are accepted by the CISO"
    return role in ("ciso", "owner", "analyst"), "Low risks may be accepted by the risk owner"


def heatmap(risks: list[Any], size: int = 5) -> list[list[int]]:
    grid = [[0] * size for _ in range(size)]
    for r in risks:
        li = clamp(r.residual_likelihood or r.likelihood, 1, size) - 1
        im = clamp(r.residual_impact or r.impact, 1, size) - 1
        grid[li][im] += 1
    return grid
