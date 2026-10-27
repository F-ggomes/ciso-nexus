"""Compliance & Gap Analysis API routes."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import DB, Org, Who
from app.core.security import require_roles
from app.db.models import Policy, PolicyVersion
from app.services.compliance_engine import compute_compliance_coverage, generate_remediation_clause

router = APIRouter(tags=["compliance"])


class ApplyRemediationIn(BaseModel):
    policy_id: str
    clause_text: str
    change_note: str = "Aditamento de conformidade legal regulamentar"


@router.get("/compliance/coverage")
def get_coverage(
    db: DB,
    who: Who,
    org: Org,
    org_id: str | None = None,
    regulation: str | None = None,
) -> dict[str, Any]:
    target_org_id = org_id or org.id
    return compute_compliance_coverage(db, target_org_id, regulation_family=regulation)


@router.get("/compliance/gaps")
def get_gaps(
    db: DB,
    who: Who,
    org: Org,
    org_id: str | None = None,
    regulation: str | None = None,
    severity: str | None = None,
) -> dict[str, Any]:
    target_org_id = org_id or org.id
    res = compute_compliance_coverage(db, target_org_id, regulation_family=regulation)
    gaps = [it for it in res.get("items", []) if it["status"] == "gap"]
    if severity:
        gaps = [it for it in gaps if it.get("severity") == severity]
    
    # Sort critical first
    gaps.sort(key=lambda x: (0 if x["severity"] == "critical" else 1 if x["severity"] == "high" else 2))
    return {
        "org": res.get("org"),
        "total_gaps": len(gaps),
        "critical_gaps_count": sum(1 for g in gaps if g["severity"] == "critical"),
        "gaps": gaps,
    }


@router.get("/compliance/remediate/{obligation_id}")
def get_remediation(
    db: DB,
    who: Who,
    org: Org,
    obligation_id: str,
    org_id: str | None = None,
) -> dict[str, Any]:
    target_org_id = org_id or org.id
    res = generate_remediation_clause(db, target_org_id, obligation_id)
    if "error" in res:
        raise HTTPException(404, res["error"])
    return res


@router.post("/compliance/remediate/{obligation_id}/apply", dependencies=[Depends(require_roles("ciso", "analyst"))])
def apply_remediation(
    db: DB,
    who: Who,
    org: Org,
    obligation_id: str,
    body: ApplyRemediationIn,
) -> dict[str, Any]:
    policy = db.get(Policy, body.policy_id)
    if not policy or policy.org_id != org.id:
        raise HTTPException(404, "Policy not found or not in active tenant")

    # Fetch latest version content
    latest = (
        db.query(PolicyVersion)
        .filter(PolicyVersion.policy_id == policy.id)
        .order_by(PolicyVersion.version.desc())
        .first()
    )
    current_content = latest.content_md if latest else f"# {policy.title}\n\n"
    new_content = current_content + f"\n\n---\n\n{body.clause_text}\n"

    new_version_num = (latest.version + 1) if latest else 1
    import hashlib
    sha = hashlib.sha256(new_content.encode("utf-8")).hexdigest()

    new_version = PolicyVersion(
        policy_id=policy.id,
        version=new_version_num,
        content_md=new_content,
        change_note=f"{body.change_note} (Obrigação: {obligation_id})",
        author=who.sub,
        ai_generated=True,
        approved_by=who.sub,
        sha256=sha,
    )
    db.add(new_version)
    policy.current_version = new_version_num
    # Add obligation_id to requirement_refs if not present
    refs = list(policy.requirement_refs or [])
    if not any(r.get("ref") == obligation_id for r in refs if isinstance(r, dict)):
        refs.append({"framework_id": "obligation", "ref": obligation_id})
        policy.requirement_refs = refs

    db.commit()
    db.refresh(policy)
    return {
        "status": "applied",
        "policy_id": policy.id,
        "policy_code": policy.code,
        "version": new_version_num,
        "message": f"Cláusula de conformidade anexada com sucesso à política {policy.code} (v{new_version_num}).",
    }
