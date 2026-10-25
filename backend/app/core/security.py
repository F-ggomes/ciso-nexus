"""Authentication helpers: JWT bearer tokens and role checks.

Roles follow the segregation-of-duties model a CISO needs:
  ciso      - full read, approve risk acceptances, approve AI actions
  analyst   - operate connectors, triage, draft
  auditor   - read-only incl. evidence and AI audit log
  owner     - control/risk owner: read own items, update treatment
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel

from app.core.config import get_settings

Role = Literal["ciso", "analyst", "auditor", "owner"]
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class Principal(BaseModel):
    sub: str
    role: Role
    tenant: str = "default"


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(principal: Principal) -> str:
    s = get_settings()
    payload = principal.model_dump()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=s.access_token_minutes)
    return jwt.encode(payload, s.secret_key.get_secret_value(), algorithm="HS256")


def current_principal(token: Annotated[str, Depends(oauth2_scheme)]) -> Principal:
    s = get_settings()
    try:
        data = jwt.decode(token, s.secret_key.get_secret_value(), algorithms=["HS256"])
        principal = Principal(sub=data["sub"], role=data["role"], tenant=data.get("tenant", "default"))
    except (JWTError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    # Re-check account state so deactivation, lockout and role changes take effect before token expiry
    from app.db.models import User
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=principal.sub).first()
        if not user or not user.is_active or (user.locked_until and user.locked_until > datetime.now(timezone.utc)):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account inactive or locked")
        principal.role = user.role
    finally:
        db.close()
    return principal


def require_roles(*roles: Role):
    def _dep(p: Annotated[Principal, Depends(current_principal)]) -> Principal:
        if p.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return p

    return _dep
