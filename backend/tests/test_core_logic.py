"""Unit tests that need no database or web framework."""
from __future__ import annotations

import json
import pathlib
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

PACKS = pathlib.Path(__file__).resolve().parents[1] / "app" / "content" / "packs"


# ---------------------------------------------------------------- content packs
def _packs():
    out = []
    for f in sorted(PACKS.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        out.extend(data if isinstance(data, list) else [data])
    return out


def test_packs_have_required_fields_and_unique_ids():
    packs = _packs()
    ids = [p["id"] for p in packs]
    assert len(ids) == len(set(ids)), "duplicate framework ids"
    for p in packs:
        for field in ("id", "name", "kind", "jurisdiction", "pack_version", "requirements"):
            assert field in p, f"{p.get('id')} missing {field}"
        refs = [r["ref"] for r in p["requirements"]]
        assert len(refs) == len(set(refs)), f"{p['id']} duplicate requirement refs"


def test_iso27001_has_93_annex_a_controls_and_clauses():
    iso = next(p for p in _packs() if p["id"] == "iso27001-2022")
    annex = [r for r in iso["requirements"] if r["ref"].startswith("A.")]
    assert len(annex) == 93
    assert {r["domain"] for r in annex} == {"Organizational", "People", "Physical", "Technological"}
    assert any(r["ref"] == "6.1.3" for r in iso["requirements"])


def test_crosswalks_point_to_existing_frameworks_and_refs():
    from app.services.refs import parent_refs

    packs = {p["id"]: p for p in _packs()}
    refs = {(pid, r["ref"]) for pid, p in packs.items() for r in p["requirements"]}
    missing = []
    for pid, p in packs.items():
        for r in p["requirements"]:
            for link in r.get("crosswalk", []):
                if link["framework_id"] not in packs:
                    missing.append(f"{pid}:{r['ref']} -> unknown framework {link['framework_id']}")
                elif packs[link["framework_id"]]["requirements"] and not any((link["framework_id"], c) in refs for c in parent_refs(link["ref"])):
                    missing.append(f"{pid}:{r['ref']} -> {link['framework_id']} {link['ref']} not found")
    assert not missing, missing


def test_jurisdictions_cover_pt_eu_ao():
    j = {p["jurisdiction"] for p in _packs()}
    assert {"PT", "EU", "AO", "INTL"} <= j


# ---------------------------------------------------------------- risk engine
def _risk(**kw):
    base = {"likelihood": 3, "impact": 3, "inherent_score": 0, "residual_likelihood": None, "residual_impact": None, "residual_score": None,
                "level": "medium", "treatment": "open", "review_at": None}
    base.update(kw)
    return SimpleNamespace(**base)


def test_risk_levels_follow_appetite():
    from app.services.risk_engine import DEFAULT_APPETITE, compute, level_for

    assert level_for(4, DEFAULT_APPETITE) == "low"
    assert level_for(8, DEFAULT_APPETITE) == "medium"
    assert level_for(12, DEFAULT_APPETITE) == "high"
    assert level_for(20, DEFAULT_APPETITE) == "critical"
    r = compute(_risk(likelihood=5, impact=5), DEFAULT_APPETITE)
    assert r.inherent_score == 25 and r.level == "critical" and r.review_at is not None


def test_residual_from_control_effectiveness_and_clamping():
    from app.services.risk_engine import DEFAULT_APPETITE, compute

    r = compute(_risk(likelihood=9, impact=4, treatment="mitigate"), DEFAULT_APPETITE, control_effectiveness=0.6)
    assert r.likelihood == 5  # clamped to the 5x5 matrix
    assert r.residual_likelihood == 2 and r.residual_impact == 4 and r.residual_score == 8
    assert r.level == "medium"


def test_acceptance_segregation_of_duties():
    from app.services.risk_engine import DEFAULT_APPETITE, acceptance_allowed

    assert acceptance_allowed(_risk(inherent_score=4), DEFAULT_APPETITE, "owner")[0]
    assert not acceptance_allowed(_risk(inherent_score=12), DEFAULT_APPETITE, "owner")[0]
    assert acceptance_allowed(_risk(inherent_score=12), DEFAULT_APPETITE, "ciso")[0]
    assert not acceptance_allowed(_risk(inherent_score=20), DEFAULT_APPETITE, "analyst")[0]


def test_heatmap_counts():
    from app.services.risk_engine import heatmap

    grid = heatmap([_risk(likelihood=1, impact=1), _risk(likelihood=5, impact=5), _risk(likelihood=5, impact=5)])
    assert grid[0][0] == 1 and grid[4][4] == 2 and sum(map(sum, grid)) == 3


# ---------------------------------------------------------------- regulatory deadlines
def test_parent_refs():
    from app.services.refs import parent_refs

    assert parent_refs("GV.PO-01") == ["GV.PO-01", "GV.PO"]
    assert parent_refs("6.3") == ["6.3", "6"]
    assert parent_refs("Art. 30(2)(a)") == ["Art. 30(2)(a)", "Art. 30(2)", "Art. 30"]
    assert parent_refs("A.5.19") == ["A.5.19", "A.5", "A"]


def test_regulatory_deadlines_are_deterministic():
    from app.ai.agents.incident_classifier import regulatory_deadlines

    t0 = datetime(2026, 10, 25, 10, 0, tzinfo=UTC)
    d = regulatory_deadlines(t0, dora_major=True, nis2=True, pdb=True)
    regimes = [x["regime"] for x in d]
    assert "DORA initial notification" in regimes and "GDPR Art. 33 notification to CNPD" in regimes
    dora_initial = next(x for x in d if x["regime"] == "DORA initial notification")
    assert dora_initial["due"] == "2026-10-25T14:00:00+00:00"
    nis2_early = next(x for x in d if "early warning" in x["regime"])
    assert nis2_early["due"] == "2026-10-26T10:00:00+00:00"
    assert regulatory_deadlines(t0, False, False, False) == []


# ---------------------------------------------------------------- redaction & json parsing
def test_redaction_masks_identifiers_consistently():
    from app.ai.redaction import redact

    text = "user joao.silva@tobe.pt from 10.1.2.3 and again joao.silva@tobe.pt NIF 234567890 IBAN PT50000201231234567890154"
    out, changed = redact(text)
    assert changed and "joao.silva" not in out and "10.1.2.3" not in out and "234567890" not in out
    assert out.count("<EMAIL:") == 2 and len({x for x in out.split() if x.startswith("<EMAIL:")}) == 1
    assert "PT50" not in out and "<IBAN:" in out
    kept, _ = redact("detected 2026-10-25T10:00:00 score 12 contract ends 2027-01-31")
    assert "2026-10-25T10:00:00" in kept and "2027-01-31" in kept  # timestamps and dates survive for deadline reasoning
    phone, _ = redact("call +351 931 497 229")
    assert "<PHONE:" in phone


def test_parse_json_tolerates_fences_and_prose():
    from app.ai.util import parse_json

    assert parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json('Here you go: {"dora_major": true, "x": [1,2]} thanks') == {"dora_major": True, "x": [1, 2]}
    assert parse_json("no json here") == {}


# ---------------------------------------------------------------- config assistant validation
def test_config_assistant_strips_unknown_fields_and_secrets():
    from app.ai.agents.config_assistant import ConfigAssistant

    proposal = {"connectors": [{"key": "wazuh", "settings": {"url": "https://w:55000", "password": "x", "bogus": 1}},
                               {"key": "nope", "settings": {}}]}
    out = ConfigAssistant.validate(proposal)
    wazuh = out["connectors"][0]
    assert "password" not in wazuh["settings"] and "bogus" not in wazuh["settings"] and "password" in wazuh["secrets_needed"]
    assert not out["validation"]["ok"] and any("unknown connector" in n for n in out["validation"]["notes"])


def test_connector_catalogue_complete():
    from app.connectors.schemas import connector_schemas

    keys = set(connector_schemas())
    assert {"wazuh", "azure", "m365", "jira", "servicenow", "teams", "ciso_assistant", "simplerisk", "eramba", "onetrust", "archer"} <= keys


# ---------------------------------------------------------------- reporting renderers (pure)
def test_xlsx_and_csv_renderers():
    pytest.importorskip("openpyxl")
    from app.services.reporting import to_csv, to_xlsx

    rows = [{"a": 1, "b": "x"}, {"a": 2, "b": "y"}]
    assert to_csv(rows).decode("utf-8-sig").splitlines()[0] == "a,b"
    assert to_xlsx(rows)[:2] == b"PK"


# ---------------------------------------------------------------- document templates
def test_templates_load_and_render():
    from app.services.templates import find_template, list_templates, render

    t = list_templates()
    assert {"policy", "procedure", "process"}.issubset({x["kind"] for x in t})
    assert any(x["code"] == "POL-05" for x in t) and any(x["generic"] and x["kind"] == "process" for x in t)
    tpl = find_template("POL-05", "policy")
    out = render(tpl, org_name="Tobe", code="POL-05", title="TPRM", requirement_refs=[{"framework_id": "dora", "ref": "Art. 28"}],
                 requirement_titles={"dora:Art. 28": "ICT third-party risk"}, scope_statement="SGSI", owner="CISO")
    assert "{{" not in out and "dora Art. 28" in out and "Tobe" in out
    generic = find_template("XYZ-99", "procedure")
    assert generic["generic"] and "Passos" in generic["body"]
