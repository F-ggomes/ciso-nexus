"""ISMS setup for an organization according to its business scope.

`recommend_frameworks` turns organization facts (country, sector, services, regulated status) into
the applicable set; `bootstrap` creates the ISMS scope, one Control (SoA line) per requirement of
each applicable framework, the baseline document plan (policies/procedures to write) and the
initial Kanban backlog, so a company starting from zero (no policies, no processes) gets a
concrete 90-day plan on day one.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

import hashlib

from app.db.models import Control, Framework, ISMSScope, Organization, Policy, PolicyVersion, Task
from app.services.templates import render_for_policy

BASELINE_DOCUMENTS = [
    ("POL-01", "Política de Segurança da Informação", "policy", ["iso27001-2022:5.2", "iso27001-2022:A.5.1", "nis2:Art. 21(2)(a)"]),
    ("POL-02", "Política de Controlo de Acessos", "policy", ["iso27001-2022:A.5.15", "iso27001-2022:A.8.5", "nis2:Art. 21(2)(i)"]),
    ("POL-03", "Política de Classificação e Tratamento da Informação", "policy", ["iso27001-2022:A.5.12", "iso27001-2022:A.5.13"]),
    ("POL-04", "Política de Uso Aceitável", "policy", ["iso27001-2022:A.5.10"]),
    ("POL-05", "Política de Segurança nas Relações com Fornecedores (TPRM)", "policy", ["iso27001-2022:A.5.19", "dora:Art. 28", "nis2:Art. 21(2)(d)"]),
    ("POL-06", "Política de Gestão de Incidentes de Segurança", "policy", ["iso27001-2022:A.5.24", "dora:Art. 17", "nis2:Art. 21(2)(b)"]),
    ("POL-07", "Política de Continuidade de Negócio e Recuperação", "policy", ["iso27001-2022:A.5.30", "dora:Art. 11", "nis2:Art. 21(2)(c)"]),
    ("POL-08", "Política de Criptografia", "policy", ["iso27001-2022:A.8.24", "nis2:Art. 21(2)(h)"]),
    ("POL-09", "Política de Segurança no Desenvolvimento (SDLC)", "policy", ["iso27001-2022:A.8.25", "nis2:Art. 21(2)(e)"]),
    ("POL-10", "Política de Protecção de Dados Pessoais", "policy", ["gdpr:Art. 5", "gdpr:Art. 32", "lei-22-11-ao:Princípios"]),
    ("POL-11", "Política de Utilização de Inteligência Artificial", "policy", ["iso42001-2023:A.2", "eu-ai-act:Art. 4"]),
    ("PRC-01", "Procedimento de Gestão de Risco (ISO 27005)", "procedure", ["iso27001-2022:6.1.2", "iso27001-2022:6.1.3", "dora:Art. 6"]),
    ("PRC-02", "Procedimento de Gestão de Vulnerabilidades e Patches", "procedure", ["iso27001-2022:A.8.8", "dora:Art. 9"]),
    ("PRC-03", "Procedimento de Resposta a Incidentes e Notificação Regulatória", "procedure", ["dora:Art. 19", "nis2:Art. 23", "gdpr:Art. 33", "dl125-2025-pt:Notificação de incidentes"]),
    ("PRC-04", "Procedimento de Avaliação e Monitorização de Terceiros", "procedure", ["dora:Art. 28", "dora:Art. 30", "gdpr:Art. 28"]),
    ("PRC-05", "Procedimento de Gestão de Alterações", "procedure", ["iso27001-2022:A.8.32"]),
    ("PRC-06", "Procedimento de Cópias de Segurança e Restauro", "procedure", ["iso27001-2022:A.8.13", "dora:Art. 12"]),
    ("PRC-07", "Procedimento de Registo e Monitorização (Logging)", "procedure", ["iso27001-2022:A.8.15", "iso27001-2022:A.8.16", "dora:Art. 10"]),
    ("PRC-08", "Procedimento de Auditoria Interna e Revisão pela Gestão", "procedure", ["iso27001-2022:9.2", "iso27001-2022:9.3"]),
    ("PROC-01", "Processo de Onboarding e Offboarding de Colaboradores", "process", ["iso27001-2022:A.6.1", "iso27001-2022:A.6.5"]),
    ("PROC-02", "Processo de Gestão de Activos e Inventário", "process", ["iso27001-2022:A.5.9", "dora:Art. 8"]),
    ("PLAN-01", "Declaração de Aplicabilidade (SoA)", "standard", ["iso27001-2022:6.1.3"]),
    ("PLAN-02", "Plano de Tratamento do Risco", "plan", ["iso27001-2022:6.1.3"]),
    ("PLAN-03", "Plano de Formação e Sensibilização", "plan", ["iso27001-2022:A.6.3", "nis2:Art. 21(2)(g)"]),
    ("FIN-DEV-POL-01", "Política de Desenvolvimento Seguro de Software Financeiro", "policy", ["dora:Art. 16", "dora:Art. 17", "iso27001-2022:A.8.25", "cis-v8.1:16.1"]),
    ("DEV-POL-01", "Política de Ciclo de Vida de Desenvolvimento Seguro (SDLC)", "policy", ["iso27001-2022:A.8.25", "nis2:Art. 21(2)(e)", "cis-v8.1:16.1"]),
    ("DORA-POL-01", "Política de Gestão de Riscos de TIC e Resiliência Operacional", "policy", ["dora:Art. 6", "dora:Art. 8", "dora:Art. 9"]),
    ("DORA-PRC-01", "Procedimento de Notificação de Incidentes Graves de TIC", "procedure", ["dora:Art. 19", "dora:Art. 20"]),
    ("DORA-CLA-01", "Minuta de Aditamento Contratual de TIC (DORA Art. 30.º)", "clause", ["dora:Art. 30"]),
    ("NIS2-POL-01", "Política de Segurança das Redes e Sistemas de Informação", "policy", ["nis2:Art. 21", "dl125-2025-pt:Medidas de segurança"]),
    ("NIS2-PRC-01", "Procedimento de Notificação de Incidentes ao CNCS", "procedure", ["nis2:Art. 23", "dl125-2025-pt:Notificação de incidentes"]),
    ("BDP-POL-01", "Política de Governação e Segurança de TIC (BdP Aviso 3/2020)", "policy", ["dora:Art. 6", "iso27001-2022:5.1"]),
    ("BCM-PLN-01", "Plano de Continuidade de Negócio e Recuperação de Desastres", "plan", ["iso27001-2022:A.5.30", "dora:Art. 11", "dora:Art. 12"]),
    ("TPRM-POL-01", "Política de Gestão de Risco de Terceiros e Registo DORA", "policy", ["dora:Art. 28", "dora:Art. 30", "nis2:Art. 21(2)(d)"]),
]


def recommend_frameworks(org: Organization) -> list[dict]:
    rec: list[dict] = [{"id": "iso27001-2022", "reason": "Base ISMS and certification target"},
                       {"id": "iso27002-2022", "reason": "Control implementation guidance"},
                       {"id": "iso27005-2022", "reason": "Risk management method"},
                       {"id": "cis-v8.1", "reason": "Prioritised technical safeguards (IG1 first)"},
                       {"id": "nist-csf-2.0", "reason": "Board-level outcome reporting"}]
    services = set(org.services_provided or [])
    if org.country in ("PT",) or org.kind in ("operator", "subsidiary"):
        rec += [{"id": "gdpr", "reason": "Personal data of EU residents"}, {"id": "lei-58-2019-pt", "reason": "Portuguese GDPR execution law"}]
        if org.nis2_category in ("essential", "important") or "cloud_infrastructure" in services or "managed_services" in services:
            rec += [{"id": "nis2", "reason": "Essential/important entity or digital infrastructure / managed service provider"},
                    {"id": "dl125-2025-pt", "reason": "Portuguese transposition of NIS2 (CNCS supervision)"}]
    if org.country == "AO":
        rec += [{"id": "lei-22-11-ao", "reason": "Angolan personal data protection law (APD)"},
                {"id": "lei-7-17-ao", "reason": "Protection of networks and information systems (Angola)"}]
        if org.sector in ("banking", "insurance", "fintech") or org.regulated_entity:
            rec.append({"id": "bna-ict-ao", "reason": "BNA ICT and cybersecurity rules for financial institutions"})
    if org.regulated_entity and org.country != "AO" or org.sector in ("banking", "insurance", "fintech", "market_infrastructure"):
        rec += [{"id": "dora", "reason": "EU financial entity or ICT provider to financial entities"},
                {"id": "rts-2024-1774", "reason": "DORA ICT risk management RTS"}, {"id": "rts-2024-1772", "reason": "DORA incident classification RTS"},
                {"id": "its-2024-2956", "reason": "Register of Information"}, {"id": "eba-gl-2019-02", "reason": "Outsourcing guidelines"}]
        if org.country == "PT":
            rec.append({"id": "aviso-bdp-3-2020", "reason": "Banco de Portugal internal control and governance"})
    if "ciso_as_a_service" in services or "cloud_infrastructure" in services:
        rec += [{"id": "iso27017-2015", "reason": "Cloud service provider controls"}, {"id": "iso27018-2025", "reason": "PII in public cloud"},
                {"id": "iso22301-2019", "reason": "Business continuity for service delivery"}]
    if "ai_products" in services or "software_development" in services:
        rec += [{"id": "iso42001-2023", "reason": "AI management system"}, {"id": "eu-ai-act", "reason": "AI systems placed on the EU market or used in the EU"}]
    seen, out = set(), []
    for r in rec:
        if r["id"] not in seen:
            seen.add(r["id"])
            out.append(r)
    return out


def bootstrap(db: Session, org: Organization, framework_ids: list[str], scope_statement: str, author: str,
              language: str = "pt-PT") -> dict:
    """Create scope, SoA lines, baseline document skeletons and the 90-day backlog."""
    existing = db.query(ISMSScope).filter_by(org_id=org.id).first()
    scope = existing or ISMSScope(org_id=org.id)
    scope.statement = scope_statement
    scope.applicable_frameworks = framework_ids
    scope.boundaries = scope.boundaries or {"sites": [], "systems": [], "processes": [], "exclusions": []}
    db.add(scope)
    created_controls = 0
    for fid in framework_ids:
        fw = db.get(Framework, fid)
        if not fw:
            continue
        for req in fw.requirements:
            if not db.query(Control).filter_by(org_id=org.id, requirement_id=req.id).first():
                db.add(Control(org_id=org.id, requirement_id=req.id, applicable=True, status="not_implemented"))
                created_controls += 1
    created_docs = 0
    now = datetime.now(timezone.utc)
    for code, title, kind, refs in BASELINE_DOCUMENTS:
        if db.query(Policy).filter_by(org_id=org.id, code=code).first():
            continue
        applicable_refs = [{"framework_id": r.split(":")[0], "ref": r.split(":", 1)[1]} for r in refs if r.split(":")[0] in framework_ids]
        if not applicable_refs and kind != "standard":
            continue
        pol = Policy(org_id=org.id, code=code, title=title, doc_kind=kind, language=language, status="draft",
                     requirement_refs=applicable_refs, next_review_at=now + timedelta(days=365))
        db.add(pol)
        db.flush()
        content = render_for_policy(db, org, pol, scope_statement, scope.risk_appetite, author)
        db.add(PolicyVersion(policy_id=pol.id, version=1, content_md=content, change_note="template", author=author,
                             sha256=hashlib.sha256(content.encode()).hexdigest()))
        created_docs += 1
    plan = [
        ("Aprovar âmbito do SGSI e nomear responsáveis (CISO, DPO, owners)", 7, "critical"),
        ("Inventariar activos, serviços e fornecedores críticos (jóias da coroa)", 14, "critical"),
        ("Avaliação de risco inicial (ISO 27005) e apetite pelo risco", 21, "critical"),
        ("Aprovar POL-01 Política de Segurança da Informação", 21, "high"),
        ("Ligar conectores (Wazuh, Azure/Entra, M365) e recolher evidências baseline", 30, "high"),
        ("Gap assessment inicial por framework aplicável", 30, "high"),
        ("Procedimento de incidentes e cadeia de notificação (DORA/NIS2/RGPD)", 45, "high"),
        ("Avaliar e contratualizar fornecedores TIC críticos (DORA Art. 30)", 60, "high"),
        ("Declaração de Aplicabilidade e plano de tratamento", 60, "high"),
        ("Formação e sensibilização inicial", 75, "medium"),
        ("Auditoria interna e revisão pela gestão", 90, "medium"),
    ]
    created_tasks = 0
    for title, days, prio in plan:
        if db.query(Task).filter_by(org_id=org.id, title=title).first():
            continue
        db.add(Task(org_id=org.id, title=title, status="todo", priority=prio, due_at=now + timedelta(days=days),
                    sprint="ISMS-90d", related_kind="isms", related_id=scope.id))
        created_tasks += 1
    db.commit()
    return {"scope_id": scope.id, "controls_created": created_controls, "documents_created": created_docs, "tasks_created": created_tasks,
            "frameworks": framework_ids}
