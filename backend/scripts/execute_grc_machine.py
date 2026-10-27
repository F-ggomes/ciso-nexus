"""Master execution script for CISO Nexus:
1. Approves and formally attests all instantiated policies across all organizations (Pillar 1).
2. Sets up SoA controls to 'implemented' and generates Gap Assessments & Audit packs (Pillar 2).
3. Populates ICT third-party vendors and sub-outsourcing supply chains (TPRM - Pillar 3).
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.db.models import (
    Control,
    Framework,
    GapAssessment,
    Organization,
    Policy,
    PolicyAttestation,
    Requirement,
    Vendor,
)
from app.db.session import SessionLocal
from app.services.gap_analysis import run_gap_assessment
from app.services.reporting import generate

NOW = datetime.now(UTC)
ONE_YEAR_LATER = NOW + timedelta(days=365)


def run_pillar_1_approvals(db):
    print("\n========================================================")
    print("PILLAR 1: Workflow de Aprovação & Sign-Off Formal")
    print("========================================================")
    all_policies = db.query(Policy).all()
    approved_count = 0
    attestation_count = 0

    for p in all_policies:
        # Check current version
        cur_v = next((v for v in p.versions if v.version == p.current_version), None)
        if cur_v:
            cur_v.approved_by = "ciso@example.com"
            cur_v.approved_at = NOW
        p.status = "approved"
        p.next_review_at = ONE_YEAR_LATER
        approved_count += 1

        # Add CISO attestation
        ciso_att = (
            db.query(PolicyAttestation)
            .filter_by(policy_id=p.id, user_email="ciso@example.com", version=p.current_version)
            .first()
        )
        if not ciso_att:
            db.add(
                PolicyAttestation(
                    policy_id=p.id,
                    version=p.current_version,
                    user_email="ciso@example.com",
                    attested_at=NOW,
                )
            )
            attestation_count += 1

        # Add Security Committee attestation
        sec_att = (
            db.query(PolicyAttestation)
            .filter_by(policy_id=p.id, user_email="comite.seguranca@tobe.pt", version=p.current_version)
            .first()
        )
        if not sec_att:
            db.add(
                PolicyAttestation(
                    policy_id=p.id,
                    version=p.current_version,
                    user_email="comite.seguranca@tobe.pt",
                    attested_at=NOW,
                )
            )
            attestation_count += 1

        # Upgrade SoA controls linked to this policy's requirements
        for r in p.requirement_refs or []:
            req = db.query(Requirement).filter_by(framework_id=r.get("framework_id"), ref=r.get("ref")).first()
            if req:
                ctrl = db.query(Control).filter_by(org_id=p.org_id, requirement_id=req.id).first()
                if ctrl:
                    ctrl.applicable = True
                    ctrl.status = "implemented"
                    ctrl.maturity = max(ctrl.maturity, 4)
                    ctrl.last_reviewed_at = NOW
                    ctrl.implementation_notes = (
                        f"Implementado, auditado e validado em conformidade com o documento {p.code}: {p.title} (v{p.current_version})."
                    )

    db.commit()
    print(f"✓ Concluído: {approved_count} políticas aprovadas e {attestation_count} assinaturas/atestações registadas.")


def run_pillar_2_audit_and_soa(db):
    print("\n========================================================")
    print("PILLAR 2: Auditoria & SoA por Cliente")
    print("========================================================")
    orgs = db.query(Organization).all()


    for org in orgs:
        print(f"\n--- Processando Auditoria & SoA: {org.name} ({org.country} - {org.sector}) ---")
        # Determine frameworks to assess
        fws_to_assess = ["iso27001-2022"]
        if "dora" in (org.name.lower() + org.sector.lower()):
            fws_to_assess.append("dora")
        if "nis2" in (org.name.lower() + org.sector.lower()):
            fws_to_assess.append("nis2")
        if org.country in ("PT", "EU"):
            fws_to_assess.append("gdpr")

        # Run Gap Assessments
        for fwid in fws_to_assess:
            fw = db.get(Framework, fwid)
            if fw:
                existing_ga = db.query(GapAssessment).filter_by(org_id=org.id, framework_id=fwid).first()
                if not existing_ga:
                    try:
                        ga = run_gap_assessment(
                            db,
                            org.id,
                            fwid,
                            create_tasks=False,
                            title=f"Auditoria de Conformidade {fw.name} ({org.name})",
                        )
                        print(f"  ✓ Gap Assessment {fwid}: Cobertura {ga.coverage_pct:.1f}%")
                    except (ValueError, KeyError, TypeError, OSError) as e:
                        print(f"  ! Gap assessment erro para {fwid}: {e}")

        # Pre-generate official audit reports
        for kind, fmt in [("soa", "xlsx"), ("soa", "csv"), ("soa", "md"), ("roi", "xlsx"), ("roi", "csv"), ("risk_register", "xlsx")]:
            try:
                _data, _media, rep = generate(db, org.id, kind, fmt, "ciso@example.com")
                print(f"  ✓ Relatório gerado: {kind}.{fmt} (SHA-256: {rep.sha256[:12]}...)")
            except (ValueError, KeyError, TypeError, OSError) as exc:
                print(f"  ! Aviso ao gerar relatório {kind}.{fmt}: {exc}")


def run_pillar_3_tprm_suppliers(db):
    print("\n========================================================")
    print("PILLAR 3: Gestão de Risco de Terceiros (TPRM)")
    print("========================================================")

    # Standard DORA Art. 30 contractual provisions set
    DORA_ART_30_COMPLIANT = {
        "security_clauses": "compliant",
        "audit_inspection_rights": "compliant",
        "service_level_agreements": "compliant",
        "data_location_and_transfer": "compliant",
        "sub_outsourcing_authorization": "compliant",
        "incident_reporting_4h": "compliant",
        "business_continuity_testing": "compliant",
        "termination_and_exit_assistance": "compliant",
    }

    VENDORS_BY_ORG = {
        "Tobe | Selenium Group": [
            {
                "name": "Amazon Web Services (AWS EMEA)",
                "lei": "5493006MHB84DD0ZWV18",
                "country": "LU",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Cloud Infrastructure & Hosting (IaaS/PaaS)",
                "sub_outsourcing": True,
                "subcontractors": ["Datadog Inc.", "Cloudflare Inc.", "Twilio Ireland"],
                "data_location": "EU (Frankfurt, Dublin)",
                "personal_data": True,
                "contract_ref": "TOBE-AWS-2024-001",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 90,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "highly",
                "inherent_score": 18,
                "residual_score": 5,
                "external_rating": {"score": 96, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "Microsoft Ireland Operations (Azure & Entra ID)",
                "lei": "549300A1A8Z627883260",
                "country": "IE",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Identity Provider (IdP) & Microsoft 365 Cloud",
                "sub_outsourcing": True,
                "subcontractors": ["Akamai Technologies", "CenturyLink"],
                "data_location": "EU (Amsterdam, Dublin)",
                "personal_data": True,
                "contract_ref": "TOBE-MSFT-2024-002",
                "contract_start": datetime(2024, 3, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 2, 28, tzinfo=UTC),
                "notice_period_days": 60,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "medium",
                "inherent_score": 16,
                "residual_score": 4,
                "external_rating": {"score": 94, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "CrowdStrike Falcon (SOC & MDR)",
                "lei": "549300X8J1N99R6Z1234",
                "country": "US",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Endpoint Detection & Managed Response (MDR)",
                "sub_outsourcing": False,
                "subcontractors": [],
                "data_location": "EU (Frankfurt)",
                "personal_data": True,
                "contract_ref": "TOBE-CS-2025-SOC",
                "contract_start": datetime(2025, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2026, 12, 31, tzinfo=UTC),
                "notice_period_days": 60,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "highly",
                "inherent_score": 15,
                "residual_score": 4,
                "external_rating": {"score": 92, "grade": "A", "provider": "SecurityScorecard"},
            },
        ],
        "Banco Alfa (Fintech & DORA)": [
            {
                "name": "SIBS Forward Payment Solutions S.A.",
                "lei": "529900B5B110B6B10931",
                "country": "PT",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Processamento de Pagamentos & Rede Multibanco",
                "sub_outsourcing": True,
                "subcontractors": ["Euronet 360", "Visa Europe Services", "Mastercard Europe"],
                "data_location": "PT (Lisboa, Porto)",
                "personal_data": True,
                "contract_ref": "BA-SIBS-2023-CORE",
                "contract_start": datetime(2023, 6, 1, tzinfo=UTC),
                "contract_end": datetime(2028, 5, 31, tzinfo=UTC),
                "notice_period_days": 180,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 25,
                "residual_score": 6,
                "external_rating": {"score": 95, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "FinCore Solutions Ltd (Core Banking SaaS)",
                "lei": "213800K109847ZZW9211",
                "country": "UK",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Core Banking Cloud Platform & Ledger",
                "sub_outsourcing": True,
                "subcontractors": ["Amazon Web Services EMEA", "MongoDB Cloud Ireland"],
                "data_location": "EU (Frankfurt)",
                "personal_data": True,
                "contract_ref": "BA-FINCORE-2024-01",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 120,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 22,
                "residual_score": 7,
                "external_rating": {"score": 90, "grade": "A", "provider": "SecurityScorecard"},
            },
            {
                "name": "Feedzai Portugal S.A. (AML & Fraud Prevention)",
                "lei": "549300FDZ98877112233",
                "country": "PT",
                "tier": 2,
                "supports_critical_function": True,
                "service_type": "Prevenção de Fraude e Branqueamento de Capitais (AML/CTF)",
                "sub_outsourcing": True,
                "subcontractors": ["Google Cloud Ireland"],
                "data_location": "EU (Lisboa, Frankfurt)",
                "personal_data": True,
                "contract_ref": "BA-FEEDZAI-2024-AML",
                "contract_start": datetime(2024, 2, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 1, 31, tzinfo=UTC),
                "notice_period_days": 90,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "medium",
                "inherent_score": 17,
                "residual_score": 5,
                "external_rating": {"score": 93, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "SWIFT SCRL (Financial Messaging Bureau)",
                "lei": "54930000000000SWIFT1",
                "country": "BE",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Mensageria Financeira Interbancária Internacional",
                "sub_outsourcing": False,
                "subcontractors": [],
                "data_location": "EU (Bruxelas, Zoeterwoude)",
                "personal_data": True,
                "contract_ref": "BA-SWIFT-2022-MB",
                "contract_start": datetime(2022, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 180,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 24,
                "residual_score": 5,
                "external_rating": {"score": 98, "grade": "A", "provider": "BitSight"},
            },
        ],
        "HealthBeta (Infraestrutura Crítica NIS2)": [
            {
                "name": "MedTech Cloud PACS (Imagiologia Médica)",
                "lei": "549300MEDPACS88771122",
                "country": "FR",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Arquivo e Transmissão de Imagens Médicas (PACS / DICOM)",
                "sub_outsourcing": True,
                "subcontractors": ["OVHcloud SAS", "Scaleway Paris"],
                "data_location": "EU (França, Portugal)",
                "personal_data": True,
                "contract_ref": "HB-PACS-2023-01",
                "contract_start": datetime(2023, 5, 1, tzinfo=UTC),
                "contract_end": datetime(2026, 4, 30, tzinfo=UTC),
                "notice_period_days": 90,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "medium",
                "inherent_score": 21,
                "residual_score": 6,
                "external_rating": {"score": 91, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "Hospital Information Systems (HIS Pro)",
                "lei": "549300HISPRO991122334",
                "country": "PT",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Gestão Clínica, Triagem de Manchester e Prescrição Eletrónica",
                "sub_outsourcing": True,
                "subcontractors": ["Equinix Datacenter Lisboa"],
                "data_location": "PT (Lisboa, Porto)",
                "personal_data": True,
                "contract_ref": "HB-HIS-2022-CORE",
                "contract_start": datetime(2022, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 180,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 24,
                "residual_score": 7,
                "external_rating": {"score": 93, "grade": "A", "provider": "SecurityScorecard"},
            },
            {
                "name": "Altice Portugal (Telecomunicações Hospitalares Críticas)",
                "lei": "529900ALTICE00998877",
                "country": "PT",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Links MPLS Dedicados, Conectividade Hospitalar e Redundância 5G",
                "sub_outsourcing": False,
                "subcontractors": [],
                "data_location": "PT",
                "personal_data": False,
                "contract_ref": "HB-TELCO-2024-FIBRA",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 90,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "medium",
                "inherent_score": 19,
                "residual_score": 5,
                "external_rating": {"score": 94, "grade": "A", "provider": "BitSight"},
            },
        ],
        "LuandaFin (Instituição Financeira BNA)": [
            {
                "name": "EMIS - Empresa Interbancária de Serviços S.A.",
                "lei": "549300EMISANGOLA0011",
                "country": "AO",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Operador da Rede Multicaixa & Câmara de Compensação de Angola",
                "sub_outsourcing": True,
                "subcontractors": ["Giesecke+Devrient", "Thales DIS"],
                "data_location": "AO (Luanda)",
                "personal_data": True,
                "contract_ref": "LF-EMIS-2022-MCX",
                "contract_start": datetime(2022, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 180,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 25,
                "residual_score": 6,
                "external_rating": {"score": 92, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "Asseco PST Angola (Core Banking Promosoft)",
                "lei": "549300ASSECOPST9988",
                "country": "AO",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Core Banking, Contabilidade Bancária e Reporte BNA",
                "sub_outsourcing": True,
                "subcontractors": ["Oracle Angola", "Data Center Luanda"],
                "data_location": "AO (Luanda, Talatona)",
                "personal_data": True,
                "contract_ref": "LF-ASSECO-2023-CB",
                "contract_start": datetime(2023, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2028, 12, 31, tzinfo=UTC),
                "notice_period_days": 180,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 23,
                "residual_score": 7,
                "external_rating": {"score": 89, "grade": "B", "provider": "SecurityScorecard"},
            },
            {
                "name": "Unitel Empresas (Telecomunicações & Links MPLS Luanda)",
                "lei": "549300UNITELAO001122",
                "country": "AO",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Comunicações de Dados Interagências e Conectividade BNA",
                "sub_outsourcing": False,
                "subcontractors": [],
                "data_location": "AO",
                "personal_data": False,
                "contract_ref": "LF-UNITEL-2024-FIBRA",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2026, 12, 31, tzinfo=UTC),
                "notice_period_days": 90,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "medium",
                "inherent_score": 18,
                "residual_score": 5,
                "external_rating": {"score": 91, "grade": "A", "provider": "BitSight"},
            },
        ],
        "RetailSaaS (Software E-Commerce & CRA)": [
            {
                "name": "Stripe Payments Europe Ltd",
                "lei": "5493001STRP00998877",
                "country": "IE",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Gateway de Pagamento, Checkout e Tokenização PCI DSS",
                "sub_outsourcing": True,
                "subcontractors": ["Amazon Web Services", "Visa", "Mastercard"],
                "data_location": "EU (Dublin, Frankfurt)",
                "personal_data": True,
                "contract_ref": "RS-STRIPE-2024-01",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 60,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "highly",
                "inherent_score": 19,
                "residual_score": 4,
                "external_rating": {"score": 96, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "Cloudflare Portugal Unipessoal Lda",
                "lei": "549300CFNET998877665",
                "country": "PT",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "WAF, Protecção DDoS, CDN Edge e Gestão de Certificados TLS",
                "sub_outsourcing": False,
                "subcontractors": [],
                "data_location": "EU (Lisboa, Madrid, Paris)",
                "personal_data": False,
                "contract_ref": "RS-CF-2023-SEC",
                "contract_start": datetime(2023, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2026, 12, 31, tzinfo=UTC),
                "notice_period_days": 60,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "highly",
                "inherent_score": 16,
                "residual_score": 3,
                "external_rating": {"score": 97, "grade": "A", "provider": "SecurityScorecard"},
            },
            {
                "name": "MongoDB Atlas Ireland Ltd",
                "lei": "549300MDB00112233445",
                "country": "IE",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Base de Dados Cloud Não-Relacional Gerida e Encriptada",
                "sub_outsourcing": True,
                "subcontractors": ["AWS EMEA"],
                "data_location": "EU (Frankfurt)",
                "personal_data": True,
                "contract_ref": "RS-MDB-2024-DB",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2026, 12, 31, tzinfo=UTC),
                "notice_period_days": 60,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "medium",
                "inherent_score": 18,
                "residual_score": 4,
                "external_rating": {"score": 93, "grade": "A", "provider": "BitSight"},
            },
        ],
        "Cliente Demo Angola": [
            {
                "name": "EMIS - Empresa Interbancária de Serviços Angola",
                "lei": "549300EMISDEMO00112",
                "country": "AO",
                "tier": 1,
                "supports_critical_function": True,
                "service_type": "Gateway Multicaixa e Pagamentos Eletrónicos",
                "sub_outsourcing": True,
                "subcontractors": ["Thales"],
                "data_location": "AO (Luanda)",
                "personal_data": True,
                "contract_ref": "DEMO-EMIS-2024",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2027, 12, 31, tzinfo=UTC),
                "notice_period_days": 90,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "low",
                "inherent_score": 21,
                "residual_score": 6,
                "external_rating": {"score": 90, "grade": "A", "provider": "BitSight"},
            },
            {
                "name": "Microsoft 365 Angola Business Cloud",
                "lei": "549300MSFTDEMO00112",
                "country": "IE",
                "tier": 2,
                "supports_critical_function": False,
                "service_type": "Produtividade Empresarial e Email Exchange Online",
                "sub_outsourcing": True,
                "subcontractors": ["CenturyLink"],
                "data_location": "EU (Dublin)",
                "personal_data": True,
                "contract_ref": "DEMO-M365-2024",
                "contract_start": datetime(2024, 1, 1, tzinfo=UTC),
                "contract_end": datetime(2026, 12, 31, tzinfo=UTC),
                "notice_period_days": 30,
                "art30_provisions": DORA_ART_30_COMPLIANT,
                "exit_strategy": True,
                "substitutable": "highly",
                "inherent_score": 14,
                "residual_score": 4,
                "external_rating": {"score": 94, "grade": "A", "provider": "SecurityScorecard"},
            },
        ],
    }

    total_vendors_added = 0
    orgs = db.query(Organization).all()
    org_by_name = {o.name: o for o in orgs}

    for org_name, v_list in VENDORS_BY_ORG.items():
        org = org_by_name.get(org_name)
        if not org:
            continue
        print(f"\n--- Provisionando Fornecedores & Cadeia 4th-Party para: {org.name} ---")
        for v_data in v_list:
            if v_data.get("lei"):
                v_data["lei"] = v_data["lei"][:20]
            existing = db.query(Vendor).filter_by(org_id=org.id, name=v_data["name"]).first()
            if existing:
                # Update with full metadata
                for k, val in v_data.items():
                    setattr(existing, k, val)
                existing.last_assessment_at = NOW
                existing.next_assessment_at = ONE_YEAR_LATER
                print(f"  ✓ Atualizado fornecedor: {existing.name} (Tier {existing.tier}, Crítico: {existing.supports_critical_function})")
            else:
                v = Vendor(
                    org_id=org.id,
                    last_assessment_at=NOW,
                    next_assessment_at=ONE_YEAR_LATER,
                    **v_data,
                )
                db.add(v)
                total_vendors_added += 1
                print(f"  ✓ Criado novo fornecedor: {v.name} (Tier {v.tier}, Crítico: {v.supports_critical_function})")

    db.commit()
    print("\n✓ Concluído: Fornecedores e cadeia de subcontratação sincronizados com sucesso.")


def main():
    print("Iniciando Execução Integral da Máquina GRC do CISO Nexus...")
    with SessionLocal() as db:
        # Pillar 1
        run_pillar_1_approvals(db)

        # Pillar 2
        run_pillar_2_audit_and_soa(db)

        # Pillar 3
        run_pillar_3_tprm_suppliers(db)

    print("\n========================================================")
    print("MÁQUINA GRC TOTALMENTE OPERACIONAL COM SUCESSO!")
    print("========================================================")


if __name__ == "__main__":
    main()
