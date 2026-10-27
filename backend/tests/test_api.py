"""API integration tests on SQLite (run: DATABASE_URL=sqlite:///./test.db pytest tests/test_api.py)."""
from __future__ import annotations

import os

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("sqlalchemy")

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_nexus.db")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci-only")

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.models import Organization, User
from app.db.session import Base, SessionLocal, engine, init_db
from app.main import app


@pytest.fixture(scope="module")
def client():
    init_db()
    Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()
    if not db.query(User).filter_by(email="ciso@test.local").first():
        db.add(User(email="ciso@test.local", full_name="T", role="ciso", password_hash=hash_password("Test-Password-123!")))
        db.add(User(email="owner@test.local", full_name="O", role="owner", password_hash=hash_password("Test-Password-123!")))
    if not db.query(Organization).filter_by(kind="operator").first():
        db.add(Organization(name="Op", kind="operator", country="PT", services_provided=["cloud_infrastructure", "ciso_as_a_service"], nis2_category="important"))
    db.commit()
    db.close()
    with TestClient(app) as c:
        yield c


def _token(client, user="ciso@test.local"):
    r = client.post("/api/v1/auth/token", data={"username": user, "password": "Test-Password-123!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_health_and_security_headers(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.headers["X-Frame-Options"] == "DENY"


def test_auth_required(client):
    assert client.get("/api/v1/risks").status_code == 401


def test_frameworks_loaded(client):
    h = _token(client)
    fws = client.get("/api/v1/frameworks", headers=h).json()
    assert any(f["id"] == "iso27001-2022" and f["requirements"] >= 118 for f in fws)
    assert any(f["id"] == "dora" for f in fws) and any(f["jurisdiction"] == "AO" for f in fws)


def test_isms_bootstrap_gap_and_reports(client):
    h = _token(client)
    rec = client.get("/api/v1/isms/recommend", headers=h).json()["recommended"]
    ids = [r["id"] for r in rec]
    assert "nis2" in ids and "dl125-2025-pt" in ids and "iso27017-2015" in ids
    r = client.post("/api/v1/isms/bootstrap", headers=h, json={"framework_ids": ["iso27001-2022", "dora"], "scope_statement": "SGSI teste"})
    assert r.status_code == 200 and r.json()["controls_created"] > 100 and r.json()["tasks_created"] == 11
    controls = client.get("/api/v1/isms/controls?framework_id=iso27001-2022", headers=h).json()
    client.patch(f"/api/v1/isms/controls/{controls[0]['id']}", headers=h, json={"status": "implemented", "maturity": 3})
    g = client.post("/api/v1/isms/gap/iso27001-2022", headers=h).json()
    assert 0 < g["coverage_pct"] < 5 and g["items"] > 100
    assert client.get("/api/v1/tasks/board", headers=h).json()["columns"]["backlog"]
    policies = client.get("/api/v1/policies", headers=h).json()
    assert any(p["code"] == "POL-05" for p in policies)
    for kind, fmt in (("soa", "xlsx"), ("risk_register", "csv"), ("roi", "csv"), ("ciso_brief", "docx"), ("ciso_brief", "pdf"), ("gap", "json")):
        r = client.get(f"/api/v1/reports/{kind}.{fmt}", headers=h)
        assert r.status_code == 200, f"{kind}.{fmt}: {r.text}"


def test_risk_lifecycle_and_sod(client):
    h = _token(client)
    r = client.post("/api/v1/risks", headers=h, json={"title": "Ransomware on file server", "likelihood": 4, "impact": 5,
                                                       "actions": [{"action": "Enable immutable backups", "owner_role": "IT", "due_days": 14}]}).json()
    assert r["inherent_score"] == 20 and r["level"] == "critical"
    owner = _token(client, "owner@test.local")
    assert client.post(f"/api/v1/risks/{r['id']}/accept", headers=owner, json={"justification": "x"}).status_code == 403
    assert client.post(f"/api/v1/risks/{r['id']}/accept", headers=h, json={"justification": "insured"}).status_code == 200
    assert client.get("/api/v1/risks/heatmap", headers=h).json()["matrix"][3][4] >= 1


def test_vendor_roi_and_incident(client):
    h = _token(client)
    v = client.post("/api/v1/vendors", headers=h, json={"name": "Cloud Provider X", "country": "IE", "tier": 1, "supports_critical_function": True,
                                                         "service_type": "IaaS", "data_location": "EU"}).json()
    csv = client.get("/api/v1/vendors/register-of-information.csv", headers=h).text
    assert "Cloud Provider X" in csv and "supports_critical_or_important_function" in csv
    i = client.post("/api/v1/incidents", headers=h, json={"title": "Outage", "severity": "high", "vendor_id": v["id"]}).json()
    assert i["status"] == "open"
    s = client.get("/api/v1/dashboard/summary", headers=h).json()
    assert s["vendors"]["critical_function"] >= 1 and s["incidents"]["open"] >= 1


def test_evidence_upload_and_integrity(client):
    h = _token(client)
    r = client.post("/api/v1/evidence/upload", headers=h, files={"file": ("policy.txt", b"MFA enforced for all admins", "text/plain")},
                    data={"title": "MFA screenshot note", "result": "pass"})
    assert r.status_code == 201 and len(r.json()["sha256"]) == 64
    assert client.get("/api/v1/evidence", headers=h).json()[0]["source"] == "upload"


def test_connector_config_encrypted_and_validated(client):
    h = _token(client)
    r = client.put("/api/v1/connectors/wazuh", headers=h, json={"settings": {"url": "https://wazuh:55000"}, "secrets": {"user": "u", "password": "pw-s3cr3t"}})
    assert r.status_code == 200 and r.json()["configured"]
    assert client.put("/api/v1/connectors/wazuh", headers=h, json={"settings": {"evil": 1}}).status_code == 422
    row = next(c for c in client.get("/api/v1/connectors", headers=h).json() if c["key"] == "wazuh")
    assert row["secrets_set"] == ["password", "user"] and "pw-s3cr3t" not in str(row["settings"])


def test_policy_batch_approve(client):
    h = _token(client)
    p = client.post("/api/v1/policies", headers=h, json={"code": "POL-TEST-BATCH", "title": "Batch Test Policy", "doc_kind": "policy"}).json()
    assert p["status"] == "draft"
    res = client.post("/api/v1/policies/batch-approve", headers=h, json={"policy_ids": [p["id"]], "attest": True})
    assert res.status_code == 200 and res.json()["approved_count"] >= 1
    p_updated = client.get(f"/api/v1/policies/{p['id']}", headers=h).json()
    assert p_updated["status"] == "approved"
