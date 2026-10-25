"""AI-assisted drafting of policies, procedures and processes aligned with selected frameworks."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.ai.agents.prompts import BASE_FRAME
from app.ai.base import Message
from app.ai.router import router
from app.db.models import ISMSScope, Organization, Policy, PolicyVersion, Requirement
from app.services.templates import render_for_policy

POLICY_WRITER = BASE_FRAME + """
Role: Policy Writer. You receive `template_md`: the organisation's house template already filled with metadata, references
and the requirement matrix. Keep its structure, tables and section numbering exactly; replace bracketed placeholders and
write the substantive content. Draft a complete, audit-ready document in Markdown with these sections:
1. Objectivo e âmbito  2. Referências normativas (cite each requirement ref given)  3. Definições
4. Responsabilidades (RACI by role)  5. Regras / Procedimento (numbered, testable statements - each rule must be
verifiable by an auditor)  6. Métricas e KPIs  7. Excepções e sanções  8. Revisão e aprovação (ciclo, owner)
9. Anexo: matriz requisito -> secção do documento.
Write for the organization described (size, sector, country, services). Keep it proportionate: a 40-person
software company gets a 3-page policy, not a bank's 30-page one. Mark every statement you could not ground in
a requirement or the organization's facts with [a confirmar].
"""


async def draft_policy(db: Session, org: Organization, policy: Policy, author: str, instructions: str = "",
                       preferred=None) -> PolicyVersion:
    refs = []
    for r in policy.requirement_refs or []:
        req = db.query(Requirement).filter_by(framework_id=r["framework_id"], ref=r["ref"]).first()
        refs.append({"framework": r["framework_id"], "ref": r["ref"], "title": req.title if req else "", "domain": req.domain if req else ""})
    scope = db.query(ISMSScope).filter_by(org_id=org.id).first()
    context = {
        "organization": {"name": org.name, "country": org.country, "sector": org.sector, "size_band": org.size_band,
                         "services_provided": org.services_provided, "regulated_entity": org.regulated_entity,
                         "nis2_category": org.nis2_category},
        "document": {"code": policy.code, "title": policy.title, "kind": policy.doc_kind, "language": policy.language},
        "requirements": refs,
        "instructions": instructions,
        "template_md": render_for_policy(db, org, policy, scope.statement if scope else "", scope.risk_appetite if scope else None, author),
    }
    completion = await router.run(db, agent="policy_writer", purpose="policy_drafting", system=POLICY_WRITER,
                                  messages=[Message("user", json.dumps(context, ensure_ascii=False))], actor=author,
                                  related_object=f"policy:{policy.id}", preferred=preferred, temperature=0.3, org_id=org.id)
    content = completion.text.strip()
    version = PolicyVersion(policy_id=policy.id, version=policy.current_version + 1, content_md=content,
                            change_note=f"AI draft ({completion.provider}/{completion.model})", author=author, ai_generated=True,
                            sha256=hashlib.sha256(content.encode()).hexdigest())
    policy.current_version = version.version
    policy.status = "draft"
    db.add(version)
    db.commit()
    return version


def approve(db: Session, policy: Policy, approver: str) -> Policy:
    version = next((v for v in policy.versions if v.version == policy.current_version), None)
    if version is None:
        raise ValueError("Policy has no current version to approve")
    version.approved_by = approver
    version.approved_at = datetime.now(timezone.utc)
    policy.status = "approved"
    policy.next_review_at = datetime.now(timezone.utc) + timedelta(days=30 * max(1, policy.review_cycle_months))
    db.commit()
    return policy
