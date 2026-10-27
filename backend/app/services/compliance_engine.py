"""Compliance Engine: Automated Policy-to-Obligation Mapping, Gap Analysis and AI Remediation."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Control, Organization, Policy


def _load_obligations() -> list[dict[str, Any]]:
    content_dir = Path(__file__).resolve().parent.parent / "content"
    obl_path = content_dir / "grc_obligations.json"
    if not obl_path.is_file():
        return []
    data = json.loads(obl_path.read_text(encoding="utf-8"))
    cols = data.get("cols", [])
    rows = data.get("rows", [])
    col_idx = {c: i for i, c in enumerate(cols)}

    def _val(row: list, k: str, default: str = "") -> str:
        i = col_idx.get(k)
        if i is not None and i < len(row) and row[i] is not None:
            return str(row[i]).strip()
        return default

    items = []
    for r in rows:
        items.append({
            "obligation_id": _val(r, "obligation_id"),
            "law": _val(r, "law"),
            "article": _val(r, "article"),
            "addressee": _val(r, "addressee"),
            "topic": _val(r, "topic"),
            "obligation": _val(r, "obligation"),
            "deadline_or_timing": _val(r, "deadline_or_timing"),
            "penalty_ref": _val(r, "penalty_ref"),
            "mapping_iso27001": _val(r, "mapping_iso27001"),
            "mapping_nist_csf": _val(r, "mapping_nist_csf"),
            "evidence_examples": _val(r, "evidence_examples"),
            "source": _val(r, "source"),
        })
    return items


def normalize_regulation_family(law_text: str) -> str:
    l = law_text.lower()
    if "dora" in l:
        return "DORA"
    if "nis2" in l or "2022/2555" in l or "125/2025" in l:
        return "NIS2"
    if "gdpr" in l or "rgpd" in l or "2016/679" in l or "58/2019" in l:
        return "RGPD"
    if "bna" in l or "angola" in l or "22/11" in l or "7/17" in l:
        return "BNA / Angola"
    if "ai act" in l or "2024/1689" in l:
        return "EU AI Act"
    if "cra" in l or "cyber resilience" in l:
        return "CRA"
    if "iso" in l or "27001" in l:
        return "ISO 27001"
    return "Outros Regulamentos"


def compute_compliance_coverage(db: Session, org_id: str, regulation_family: str | None = None) -> dict[str, Any]:
    org = db.get(Organization, org_id)
    if not org:
        return {"error": "Organization not found", "coverage": {}}

    obligations = _load_obligations()
    if not obligations:
        return {"total": 0, "coverage_pct": 0, "regulations": {}, "items": []}

    # Fetch all policies for the organization
    policies = db.query(Policy).filter(Policy.org_id == org_id).all()
    # Build policy lookup indices
    # 1. By direct requirement_refs: {"dora:Art. 28": [p, ...], "iso27001-2022:A.5.1": [p, ...]}
    # 2. By title keywords: {"governance": [p, ...], "incident": [p, ...]}
    direct_ref_map: dict[str, list[Policy]] = {}
    iso_ref_map: dict[str, list[Policy]] = {}
    title_word_map: dict[str, list[Policy]] = {}

    for p in policies:
        # Index requirement refs
        for ref_item in (p.requirement_refs or []):
            if isinstance(ref_item, dict):
                fw = str(ref_item.get("framework_id", "")).lower()
                r = str(ref_item.get("ref", "")).lower().replace("art.", "").strip()
                k = f"{fw}:{r}"
                direct_ref_map.setdefault(k, []).append(p)
                if "27001" in fw or "iso" in fw:
                    iso_ref_map.setdefault(r, []).append(p)

        # Index title keywords
        words = p.title.lower().replace("-", " ").replace("/", " ").split()
        for w in words:
            if len(w) > 4:
                title_word_map.setdefault(w, []).append(p)

    # Fetch implemented controls for organization
    controls = db.query(Control).filter(Control.org_id == org_id).all()
    implemented_control_req_ids = {c.requirement_id for c in controls if c.status in ("implemented", "partially_implemented")}

    # Map each obligation
    mapped_items = []
    reg_stats: dict[str, dict[str, Any]] = {}

    for obl in obligations:
        family = normalize_regulation_family(obl["law"])
        if regulation_family and family.lower() != regulation_family.lower() and regulation_family.lower() != "all":
            continue

        matched_policy: Policy | None = None
        match_type = "none"

        # Check direct law + article match in policies
        law_lower = obl["law"].lower()
        art_clean = obl["article"].lower().replace("art.", "").strip()
        # Find matching framework key
        fw_key = "dora" if "dora" in law_lower else "nis2" if "nis2" in law_lower else "gdpr" if "gdpr" in law_lower or "rgpd" in law_lower else ""
        if fw_key and f"{fw_key}:{art_clean}" in direct_ref_map:
            matched_policy = direct_ref_map[f"{fw_key}:{art_clean}"][0]
            match_type = "direct_article"

        # Check ISO 27001 crosswalk match
        if not matched_policy and obl["mapping_iso27001"]:
            for iso_token in obl["mapping_iso27001"].split(";"):
                iso_clean = iso_token.strip().lower()
                if iso_clean in iso_ref_map:
                    matched_policy = iso_ref_map[iso_clean][0]
                    match_type = "iso_crosswalk"
                    break

        # Check topic match
        if not matched_policy and obl["topic"]:
            topic_words = obl["topic"].lower().split()
            for tw in topic_words:
                if len(tw) > 4 and tw in title_word_map:
                    matched_policy = title_word_map[tw][0]
                    match_type = "topic_inference"
                    break

        # Check control implementation
        has_control = (match_type != "none") or bool(implemented_control_req_ids)

        # Determine compliance status
        if matched_policy and matched_policy.status == "approved" and has_control:
            status = "compliant"
            status_label = "Em Conformidade"
        elif matched_policy:
            status = "partial"
            status_label = "Parcial (Política em Revisão / Controlo Pendente)"
        else:
            status = "gap"
            status_label = "Lacuna Identificada (Gap)"

        # Penalty risk weighting
        pen = obl["penalty_ref"].lower()
        severity = "critical" if ("20m" in pen or "10m" in pen or "4%" in pen or "2%" in pen or "crime" in pen) else "high" if pen else "medium"

        item_data = {
            "obligation_id": obl["obligation_id"],
            "law": obl["law"],
            "family": family,
            "article": obl["article"],
            "topic": obl["topic"],
            "obligation": obl["obligation"],
            "status": status,
            "status_label": status_label,
            "severity": severity,
            "penalty_ref": obl["penalty_ref"],
            "evidence_examples": obl["evidence_examples"],
            "mapping_iso27001": obl["mapping_iso27001"],
            "mapping_nist_csf": obl["mapping_nist_csf"],
            "policy": {
                "id": matched_policy.id,
                "code": matched_policy.code,
                "title": matched_policy.title,
                "status": matched_policy.status,
            } if matched_policy else None,
            "match_type": match_type,
        }
        mapped_items.append(item_data)

        # Update stats per regulation family
        st = reg_stats.setdefault(family, {"total": 0, "compliant": 0, "partial": 0, "gaps": 0, "critical_gaps": 0})
        st["total"] += 1
        if status == "compliant":
            st["compliant"] += 1
        elif status == "partial":
            st["partial"] += 1
        else:
            st["gaps"] += 1
            if severity == "critical":
                st["critical_gaps"] += 1

    # Calculate overall scores
    total_obl = len(mapped_items)
    compliant_count = sum(1 for it in mapped_items if it["status"] == "compliant")
    partial_count = sum(1 for it in mapped_items if it["status"] == "partial")
    gaps_count = sum(1 for it in mapped_items if it["status"] == "gap")
    critical_gaps = sum(1 for it in mapped_items if it["status"] == "gap" and it["severity"] == "critical")

    # Weighted coverage: compliant = 1.0, partial = 0.5
    coverage_score = round(((compliant_count + 0.5 * partial_count) / max(total_obl, 1)) * 100, 1)

    for st in reg_stats.values():
        st["coverage_pct"] = round(((st["compliant"] + 0.5 * st["partial"]) / max(st["total"], 1)) * 100, 1)

    return {
        "org": {"id": org.id, "name": org.name, "sector": org.sector, "country": org.country},
        "total_obligations": total_obl,
        "compliant_count": compliant_count,
        "partial_count": partial_count,
        "gaps_count": gaps_count,
        "critical_gaps_count": critical_gaps,
        "coverage_pct": coverage_score,
        "regulations": reg_stats,
        "items": mapped_items,
    }


def generate_remediation_clause(db: Session, org_id: str, obligation_id: str) -> dict[str, Any]:
    obligations = _load_obligations()
    obl = next((o for o in obligations if o["obligation_id"] == obligation_id), None)
    if not obl:
        return {"error": "Obligation not found"}

    org = db.get(Organization, org_id)
    org_name = org.name if org else "A Organização"

    family = normalize_regulation_family(obl["law"])
    article = obl["article"]
    req_text = obl["obligation"]
    evidence = obl.get("evidence_examples", "")

    # Draft targeted policy clause in European Portuguese
    suggested_title = f"Aditamento de Conformidade {family} - {article}"
    suggested_clause = f"""### Cláusula de Conformidade Obrigatória: {family} ({article})

1. **Âmbito e Aplicação:**
   Em estrito cumprimento do **{obl['law']}**, designadamente o seu **{article}**, {org_name} assegura que:
   > "{req_text}"

2. **Procedimentos Operacionais e Controlos Internos:**
   - Assegurar a implementação contínua de mecanismos de verificação e registo auditável.
   - Designar um responsável operacional pela monitorização do cumprimento do requisito em apreço.
   - Manter evidências documentadas atualizadas, designadamente: *{evidence or 'registos de auditoria, atas de revisão e relatórios periódicos de controlo'}*.

3. **Salvaguardas e Quadro Sancionatório:**
   A inobservância desta disposição constitui infração suscetível de aplicação de medidas coercivas e sanções legais nos termos de {obl['penalty_ref'] or 'disposições regulamentares aplicáveis'}.
"""

    # Identify best candidate policy to attach to
    candidate_policy = db.query(Policy).filter(Policy.org_id == org_id).filter(Policy.title.ilike(f"%{obl['topic']}%")).first()
    if not candidate_policy:
        candidate_policy = db.query(Policy).filter(Policy.org_id == org_id).first()

    return {
        "obligation_id": obligation_id,
        "law": obl["law"],
        "article": article,
        "topic": obl["topic"],
        "suggested_title": suggested_title,
        "suggested_clause": suggested_clause,
        "candidate_policy": {
            "id": candidate_policy.id,
            "code": candidate_policy.code,
            "title": candidate_policy.title,
        } if candidate_policy else None,
    }
