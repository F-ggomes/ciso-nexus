from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DB, Who, audit
from app.api.schemas import OrgCreate, TokenOut, UserCreate
from app.core.security import (
    Principal,
    Role,
    create_access_token,
    hash_password,
    require_roles,
    verify_password,
)
from app.db.models import Organization, User

router = APIRouter(tags=["auth"])
MAX_FAILED = 5
LOCK_MINUTES = 15


@router.post("/auth/token", response_model=TokenOut)
def token(db: DB, request: Request, form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = db.query(User).filter_by(email=form.username.lower()).first()
    now = datetime.now(UTC)
    if user and user.locked_until and user.locked_until > now:
        audit(db, request, form.username, "login.locked")
        raise HTTPException(423, "Account temporarily locked")
    if not user or not user.is_active or not verify_password(form.password, user.password_hash):
        if user:
            user.failed_logins += 1
            if user.failed_logins >= MAX_FAILED:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_logins = 0
            db.commit()
        audit(db, request, form.username, "login.failed")
        raise HTTPException(401, "Invalid credentials")
    user.failed_logins = 0
    db.commit()
    audit(db, request, user.email, "login.ok")
    return TokenOut(access_token=create_access_token(Principal(sub=user.email, role=cast(Role, user.role))), role=user.role, org_ids=user.org_ids)


@router.get("/auth/me")
def me(db: DB, who: Who):
    user = db.query(User).filter_by(email=who.sub).first()
    orgs = db.query(Organization).all()
    visible = [o for o in orgs if not user or not user.org_ids or o.id in user.org_ids]
    return {"email": who.sub, "role": who.role, "org_ids": user.org_ids if user else [],
            "organizations": [{"id": o.id, "name": o.name, "kind": o.kind, "country": o.country} for o in visible]}


@router.post("/users", status_code=201, dependencies=[Depends(require_roles("ciso"))])
def create_user(db: DB, request: Request, who: Who, body: UserCreate):
    if db.query(User).filter_by(email=body.email.lower()).first():
        raise HTTPException(409, "User exists")
    u = User(email=body.email.lower(), full_name=body.full_name, role=body.role, password_hash=hash_password(body.password), org_ids=body.org_ids)
    db.add(u)
    db.commit()
    audit(db, request, who.sub, "user.created", email=u.email, role=u.role)
    return {"id": u.id, "email": u.email, "role": u.role}


@router.get("/orgs")
def list_orgs(db: DB, who: Who):
    user = db.query(User).filter_by(email=who.sub).first()
    q = db.query(Organization)
    rows = q.all()
    if user and user.org_ids:
        rows = [o for o in rows if o.id in user.org_ids]
    return [{"id": o.id, "name": o.name, "kind": o.kind, "parent_id": o.parent_id, "country": o.country, "sector": o.sector,
             "size_band": o.size_band, "services_provided": o.services_provided, "regulated_entity": o.regulated_entity,
             "nis2_category": o.nis2_category} for o in rows]


@router.post("/orgs", status_code=201, dependencies=[Depends(require_roles("ciso"))])
def create_org(db: DB, request: Request, who: Who, body: OrgCreate):
    if db.query(Organization).filter_by(name=body.name).first():
        raise HTTPException(409, "Organization exists")
    org = Organization(**body.model_dump())
    db.add(org)
    db.commit()
    audit(db, request, who.sub, "org.created", org_id=org.id, name=org.name, kind=org.kind)
    return {"id": org.id, "name": org.name, "kind": org.kind}
