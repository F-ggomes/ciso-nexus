"""Admin CLI: python -m app.cli <command>

  init                          create tables and load content packs
  create-org NAME [--kind operator|client] [--country PT] [--services a,b]
  create-user EMAIL NAME ROLE   (password prompted or NEXUS_BOOTSTRAP_PASSWORD)
  seed-demo                     operator org (Tobe/Selenium style), demo CISO, ISMS bootstrap
  watch                         run regulatory watch now
  library-import                import the document library mounted at NEXUS_LIBRARY_DIR
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import secrets
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.models import GapAssessment, ISMSScope, Organization, User
from app.db.session import SessionLocal, init_db
from app.services.gap_analysis import run_gap_assessment
from app.services.isms import bootstrap, recommend_frameworks
from app.services.repository import load_content_packs, regulatory_watch


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init")
    o = sub.add_parser("create-org")
    o.add_argument("name"); o.add_argument("--kind", default="client"); o.add_argument("--country", default="PT")
    o.add_argument("--sector", default="software"); o.add_argument("--services", default="")
    o.add_argument("--regulated", action="store_true"); o.add_argument("--nis2", default=None)
    u = sub.add_parser("create-user")
    u.add_argument("email"); u.add_argument("name"); u.add_argument("role", choices=["ciso", "analyst", "auditor", "owner"])
    sub.add_parser("seed-demo")
    sub.add_parser("watch")
    sub.add_parser("library-import")
    args = p.parse_args()

    init_db()
    db = SessionLocal()
    try:
        if args.cmd == "init":
            print(load_content_packs(db))
        elif args.cmd == "create-org":
            org = Organization(name=args.name, kind=args.kind, country=args.country, sector=args.sector,
                               services_provided=[s for s in args.services.split(",") if s], regulated_entity=args.regulated, nis2_category=args.nis2)
            db.add(org); db.commit()
            print(org.id)
        elif args.cmd == "create-user":
            pw = os.getenv("NEXUS_BOOTSTRAP_PASSWORD") or getpass.getpass("Password (min 12 chars): ")
            assert 12 <= len(pw) and len(pw.encode()) <= 72, "password must be 12 chars to 72 bytes"
            db.add(User(email=args.email.lower(), full_name=args.name, role=args.role, password_hash=hash_password(pw))); db.commit()
            print("ok")
        elif args.cmd == "seed-demo":
            load_content_packs(db)
            now = datetime.now(timezone.utc)
            
            # 1. Operator
            org = db.query(Organization).filter_by(kind="operator").first()
            if not org:
                org = Organization(name="A Nossa Empresa (Operador TIC & Software)", kind="operator", country="PT", sector="software", size_band="medium",
                                   services_provided=["software_development", "cloud_infrastructure", "ciso_as_a_service"], nis2_category="important", regulated_entity=True)
                db.add(org); db.commit()
            
            # 2. Clients
            clients_data = [
                {"name": "Banco Alfa (Fintech & DORA)", "country": "PT", "sector": "banking", "size_band": "large", "regulated_entity": True, "nis2_category": "none"},
                {"name": "HealthBeta (Infraestrutura Crítica NIS2)", "country": "PT", "sector": "health", "size_band": "large", "regulated_entity": True, "nis2_category": "essential"},
                {"name": "LuandaFin (Instituição Financeira BNA)", "country": "AO", "sector": "banking", "size_band": "medium", "regulated_entity": True, "nis2_category": "none"},
                {"name": "RetailSaaS (Software E-Commerce & CRA)", "country": "PT", "sector": "software", "size_band": "small", "regulated_entity": False, "nis2_category": "none"},
            ]
            clients = {}
            for cd in clients_data:
                c = db.query(Organization).filter_by(name=cd["name"]).first()
                if not c:
                    c = Organization(name=cd["name"], kind="client", parent_id=org.id, country=cd["country"], sector=cd["sector"],
                                     size_band=cd["size_band"], regulated_entity=cd["regulated_entity"], nis2_category=cd["nis2_category"])
                    db.add(c); db.commit()
                clients[cd["name"]] = c

            # 3. CISO User (org_ids = [])
            pw = os.getenv("NEXUS_BOOTSTRAP_PASSWORD", "ciso-nexus-admin-2026")
            ciso_user = db.query(User).filter_by(email="ciso@example.com").first()
            if not ciso_user:
                ciso_user = User(email="ciso@example.com", full_name="Francisco G. (Group CISO)", role="ciso", password_hash=hash_password(pw), org_ids=[])
                db.add(ciso_user)
            else:
                ciso_user.password_hash = hash_password(pw)
                ciso_user.failed_logins = 0
                ciso_user.locked_until = None
                ciso_user.org_ids = []
            db.commit()
            print(f"demo ciso user: ciso@example.com / {pw}")

            # 4. Bootstrap ISMS for operator and Banco Alfa
            for target_org in [org, clients["Banco Alfa (Fintech & DORA)"]]:
                fws = [r["id"] for r in recommend_frameworks(target_org)]
                if not db.query(ISMSScope).filter_by(org_id=target_org.id).first():
                    bootstrap(db, target_org, fws, f"SGSI aplicável às operações e sistemas de {target_org.name}", "cli")

            # 5. Seed Incidents with Regulatory Deadlines
            from app.db.models import Incident, Vendor, Vulnerability, Risk
            banco = clients["Banco Alfa (Fintech & DORA)"]
            if not db.query(Incident).filter_by(org_id=banco.id).first():
                dora_due = (now + timedelta(hours=1, minutes=42)).isoformat()
                db.add(Incident(org_id=banco.id, title="Incidente Grave de TIC: Degradação DDoS no Gateway MB WAY",
                                description="Ataque volumétrico distribuído contra APIs de pagamento.", severity="critical",
                                status="open", dora_major=True, detected_at=now - timedelta(hours=2),
                                notification_deadlines=[{"regime": "DORA", "stage": "initial", "due": dora_due, "recipient": "Banco de Portugal / BCE"}]))
            
            health = clients["HealthBeta (Infraestrutura Crítica NIS2)"]
            if not db.query(Incident).filter_by(org_id=health.id).first():
                nis2_due = (now + timedelta(hours=14, minutes=10)).isoformat()
                db.add(Incident(org_id=health.id, title="Alerta Precoce: Anomalia de Integridade em Base de Dados Clínica",
                                description="Falha de integridade em base de dados de imagem médica detectada pelo EDR.", severity="high",
                                status="open", dora_major=False, detected_at=now - timedelta(hours=10),
                                notification_deadlines=[{"regime": "NIS2", "stage": "early_warning", "due": nis2_due, "recipient": "CNCS"}]))
            
            # 6. Seed Vendors (DORA ITS 2024/2956)
            if not db.query(Vendor).filter_by(org_id=org.id).first():
                db.add(Vendor(org_id=org.id, name="Amazon Web Services (AWS)", country="IE", service_type="cloud_infrastructure",
                              tier=1, supports_critical_function=True, contract_ref="CTR-AWS-2024-01",
                              contract_start=now - timedelta(days=365), contract_end=now + timedelta(days=700),
                              data_location="eu-west-1 (Dublin)", substitutable="medium", exit_strategy=True))
            
            if not db.query(Vendor).filter_by(org_id=banco.id).first():
                db.add(Vendor(org_id=banco.id, name="SIBS FPS S.A.", country="PT", service_type="payment_gateway",
                              tier=1, supports_critical_function=True, contract_ref="CTR-SIBS-2023",
                              contract_start=now - timedelta(days=500), contract_end=now + timedelta(days=600),
                              data_location="Portugal", substitutable="low", exit_strategy=True))
                db.add(Vendor(org_id=banco.id, name="FinCore Solutions Ltd", country="GB", service_type="core_banking_saas",
                              tier=1, supports_critical_function=True, contract_ref="CTR-FINCORE-09",
                              contract_start=now - timedelta(days=300), contract_end=now + timedelta(days=36),
                              data_location="UE / PT", substitutable="low", exit_strategy=False))

            # 7. Seed Vulnerabilities
            if not db.query(Vulnerability).filter_by(org_id=banco.id).first():
                db.add(Vulnerability(org_id=banco.id, title="CVE-2026-1189: Execução Remota em Spring Framework",
                                     cve="CVE-2026-1189", cvss=9.8, severity="critical", status="open",
                                     asset_name="core-banking-api", source="wazuh", source_ref="cve-2026-1189-ref",
                                     due_at=now + timedelta(hours=6)))
                db.add(Vulnerability(org_id=banco.id, title="CVE-2025-4982: Desvio de Autenticação em Gateway OAuth2",
                                     cve="CVE-2025-4982", cvss=8.5, severity="high", status="open",
                                     asset_name="auth-service", source="defender", source_ref="cve-2025-4982-ref",
                                     due_at=now + timedelta(days=3)))

            db.commit()
            print("seed-demo complete: operator + 4 clients + users + incidents + vendors + vulns.")
        elif args.cmd == "watch":
            print(asyncio.run(regulatory_watch(db)))
        elif args.cmd == "library-import":
            from app.services.library import import_library

            print(import_library(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
