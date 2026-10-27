"""Tests for compliance coverage engine and gap remediation."""
from __future__ import annotations

import os

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_nexus.db")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci-only")

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.models import Organization, Policy, PolicyVersion, User
from app.db.session import SessionLocal, init_db
from app.main import app
from app.services.compliance_engine import compute_compliance_coverage, generate_remediation_clause


@pytest.fixture(scope="module")
def setup_data():
    init_db()
    db = SessionLocal()
    user = db.query(User).filter_by(email="ciso_comp@test.local").first()
    if not user:
        user = User(email="ciso_comp@test.local", full_name="CISO Test", role="ciso", password_hash=hash_password("Test-Password-123!"))
        db.add(user)

    org = db.query(Organization).filter_by(name="Comp Org").first()
    if not org:
        org = Organization(name="Comp Org", kind="client", country="PT", sector="banking", regulated_entity=True)
        db.add(org)
        db.flush()

        pol = Policy(
            org_id=org.id,
            code="POL-DORA-01",
            title="Política de Risco TIC e Cibersegurança DORA",
            status="approved",
            requirement_refs=[{"framework_id": "dora", "ref": "Art. 28"}, {"framework_id": "iso27001-2022", "ref": "A.5.1"}],
        )
        db.add(pol)
        db.flush()

        pv = PolicyVersion(
            policy_id=pol.id,
            version=1,
            content_md="# Política DORA\n\nConteúdo aprovado.",
            sha256="abc",
            approved_by="ciso_comp@test.local",
        )
        db.add(pv)

    db.commit()
    org_id = org.id
    db.close()
    return org_id


@pytest.fixture(scope="module")
def client(setup_data):
    with TestClient(app) as c:
        yield c


def _token(client):
    r = client.post("/api/v1/auth/token", data={"username": "ciso_comp@test.local", "password": "Test-Password-123!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_compliance_coverage_service(setup_data):
    db = SessionLocal()
    org_id = setup_data
    res = compute_compliance_coverage(db, org_id)
    assert res["total_obligations"] > 0
    assert "DORA" in res["regulations"]
    assert res["compliant_count"] >= 1
    db.close()


def test_remediation_clause_service(setup_data):
    db = SessionLocal()
    org_id = setup_data
    rem = generate_remediation_clause(db, org_id, "DORA-OB-001")
    assert "suggested_clause" in rem
    assert "candidate_policy" in rem
    db.close()


def test_api_coverage(client):
    h = _token(client)
    r = client.get("/api/v1/compliance/coverage", headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_obligations"] > 0
    assert "regulations" in data


def test_api_gaps(client):
    h = _token(client)
    r = client.get("/api/v1/compliance/gaps", headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "gaps" in data
    assert data["total_gaps"] > 0


def test_api_remediate_and_apply(client):
    h = _token(client)
    r = client.get("/api/v1/compliance/remediate/DORA-OB-001", headers=h)
    assert r.status_code == 200, r.text
    rem = r.json()
    assert "suggested_clause" in rem
    policy_id = rem["candidate_policy"]["id"]

    # Apply remediation
    apply_res = client.post(
        "/api/v1/compliance/remediate/DORA-OB-001/apply",
        headers=h,
        json={
            "policy_id": policy_id,
            "clause_text": rem["suggested_clause"],
            "change_note": "Remediação automatizada DORA",
        },
    )
    assert apply_res.status_code == 200, apply_res.text
    assert apply_res.json()["status"] == "applied"
