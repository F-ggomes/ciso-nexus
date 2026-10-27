"""Gap analysis against a framework for one organization.

Coverage is computed from Control rows (SoA lines). A requirement without a Control row is
treated as 'not_assessed'. Evidence freshness lowers an 'implemented' control to
'partially_implemented' when its newest evidence is older than `evidence_max_age_days`.
Crosswalks let one implemented control count toward mapped requirements in other frameworks.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.db.models import Control, Evidence, Framework, GapAssessment, GapItem, Requirement, Task
from app.services.refs import parent_refs

WEIGHT = {"implemented": 1.0, "partially_implemented": 0.5, "not_implemented": 0.0, "not_assessed": 0.0, "not_applicable": None}
SEVERITY_BY_DOMAIN_KEYWORDS = [("incident", "high"), ("access", "high"), ("supplier", "high"), ("third", "high"),
                               ("backup", "high"), ("vulnerab", "high"), ("logging", "medium"), ("awareness", "medium")]


def _severity(req: Requirement, status: str) -> str:
    if status == "implemented":
        return "none"
    text = f"{req.title} {req.domain}".lower()
    for kw, sev in SEVERITY_BY_DOMAIN_KEYWORDS:
        if kw in text:
            return "critical" if status == "not_implemented" and sev == "high" else sev
    return "medium" if status == "not_implemented" else "low"


def effective_status(db: Session, control: Control | None, evidence_max_age_days: int = 365) -> str:
    if control is None:
        return "not_assessed"
    if not control.applicable or control.status == "not_applicable":
        return "not_applicable"
    if control.status == "implemented":
        newest = (db.query(Evidence).filter_by(control_id=control.id).order_by(Evidence.collected_at.desc()).first())
        if newest and newest.collected_at < datetime.now(UTC) - timedelta(days=evidence_max_age_days):
            return "partially_implemented"
        if newest and newest.result == "fail":
            return "partially_implemented"
    return control.status


def resolve_requirement(db: Session, framework_id: str, ref: str) -> Requirement | None:
    """Exact ref first, then parent refs so sub-control crosswalks resolve to the catalogued parent."""
    for candidate in parent_refs(ref):
        row = db.query(Requirement).filter_by(framework_id=framework_id, ref=candidate).first()
        if row:
            return row
    return None


def crosswalk_status(db: Session, org_id: str, req: Requirement) -> str | None:
    """If a mapped requirement in another framework is implemented, inherit 'partially_implemented' at least."""
    best = None
    for link in req.crosswalk or []:
        other = resolve_requirement(db, link["framework_id"], link["ref"])
        if not other:
            continue
        ctrl = db.query(Control).filter_by(org_id=org_id, requirement_id=other.id).first()
        st = effective_status(db, ctrl)
        if st == "implemented":
            best = "partially_implemented"
    return best


def run_gap_assessment(db: Session, org_id: str, framework_id: str, create_tasks: bool = True, title: str | None = None) -> GapAssessment:
    fw = db.get(Framework, framework_id)
    if not fw:
        raise ValueError(f"Unknown framework {framework_id}")
    ga = GapAssessment(org_id=org_id, framework_id=framework_id, title=title or f"Gap assessment {fw.name}")
    db.add(ga)
    db.flush()
    total_weight, applicable = 0.0, 0
    by_status: dict[str, int] = {}
    for req in fw.requirements:
        ctrl = db.query(Control).filter_by(org_id=org_id, requirement_id=req.id).first()
        status = effective_status(db, ctrl)
        if status in ("not_assessed", "not_implemented"):
            inherited = crosswalk_status(db, org_id, req)
            if inherited:
                status = inherited
        by_status[status] = by_status.get(status, 0) + 1
        w = WEIGHT.get(status)
        if w is None:
            continue
        applicable += 1
        total_weight += w
        if status != "implemented":
            sev = _severity(req, status)
            rec = f"Implement {req.ref} {req.title}" if status != "partially_implemented" else f"Complete and evidence {req.ref} {req.title}"
            item = GapItem(assessment_id=ga.id, requirement_id=req.id, current_status=status, gap_severity=sev, recommendation=rec)
            if create_tasks and sev in ("critical", "high"):
                task = Task(org_id=org_id, title=rec[:500], description=f"Gap from {ga.title}. Status: {status}. Domain: {req.domain}.",
                            status="backlog", priority=sev, related_kind="gap", related_id=ga.id,
                            due_at=datetime.now(UTC) + timedelta(days=30 if sev == "critical" else 60))
                db.add(task)
                db.flush()
                item.task_id = task.id
            db.add(item)
    ga.coverage_pct = round(100 * total_weight / applicable, 1) if applicable else 0.0
    ga.summary = {"by_status": by_status, "applicable": applicable, "framework": fw.name}
    db.commit()
    return ga


def coverage_by_framework(db: Session, org_id: str) -> list[dict]:
    out = []
    for fw in db.query(Framework).all():
        if not fw.requirements:
            continue
        weights, n = 0.0, 0
        for req in fw.requirements:
            ctrl = db.query(Control).filter_by(org_id=org_id, requirement_id=req.id).first()
            w = WEIGHT.get(effective_status(db, ctrl))
            if w is None:
                continue
            n += 1
            weights += w
        out.append({"id": fw.id, "name": fw.name, "jurisdiction": fw.jurisdiction, "coverage_pct": round(100 * weights / n, 1) if n else 0.0})
    return out
