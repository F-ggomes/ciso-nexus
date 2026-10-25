"""Shared dependencies: DB session, principal, organization scoping, audit."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.security import Principal, current_principal
from app.db.models import Organization, SecurityAuditLog, User
from app.db.session import get_db

DB = Annotated[Session, Depends(get_db)]
Who = Annotated[Principal, Depends(current_principal)]


def current_org(db: DB, who: Who, x_org_id: Annotated[str | None, Header()] = None) -> Organization:
    """Resolve the organization the request acts on. Users with org_ids=[] (operator CISO) may act on any org."""
    user = db.query(User).filter_by(email=who.sub).first()
    allowed = user.org_ids if user else []
    org_id = x_org_id
    if not org_id:
        if allowed:
            org_id = allowed[0]
        else:
            op = db.query(Organization).filter_by(kind="operator").first() or db.query(Organization).first()
            if not op:
                raise HTTPException(404, "No organization exists yet; create one via POST /orgs")
            org_id = op.id
    if allowed and org_id not in allowed:
        raise HTTPException(403, "Not allowed to act on this organization")
    org = db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


Org = Annotated[Organization, Depends(current_org)]


def audit(db: Session, request: Request | None, actor: str, event: str, org_id: str | None = None, **detail) -> None:
    db.add(SecurityAuditLog(actor=actor, org_id=org_id, event=event, detail=detail,
                            ip=request.client.host if request and request.client else None))
    db.commit()
