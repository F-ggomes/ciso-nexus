"""Admin CLI: python -m app.cli <command>

  init                          create tables and load content packs
  create-org NAME [--kind operator|client] [--country PT] [--services a,b]
  create-user EMAIL NAME ROLE   (password prompted or NEXUS_BOOTSTRAP_PASSWORD)
  seed-demo                     operator org (Tobe/Selenium style), demo CISO, ISMS bootstrap
  watch                         run regulatory watch now
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import secrets

from app.core.security import hash_password
from app.db.models import GapAssessment, Organization, User
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
            org = db.query(Organization).filter_by(kind="operator").first()
            if not org:
                org = Organization(name="Tobe | Selenium Group", kind="operator", country="PT", sector="software", size_band="small",
                                   services_provided=["software_development", "cloud_infrastructure", "ciso_as_a_service"], nis2_category="important")
                db.add(org); db.commit()
            client = db.query(Organization).filter_by(name="Cliente Demo Angola").first()
            if not client:
                db.add(Organization(name="Cliente Demo Angola", kind="client", parent_id=org.id, country="AO", sector="banking",
                                    size_band="medium", services_provided=[], regulated_entity=True)); db.commit()
            if not db.query(User).filter_by(email="ciso@example.com").first():
                pw = os.getenv("NEXUS_BOOTSTRAP_PASSWORD") or secrets.token_urlsafe(16)
                db.add(User(email="ciso@example.com", full_name="Demo CISO", role="ciso", password_hash=hash_password(pw))); db.commit()
                print(f"demo user ciso@example.com / {pw}")
            fws = [r["id"] for r in recommend_frameworks(org)]
            print(bootstrap(db, org, fws, "SGSI aplicável ao desenvolvimento de software, operação de infraestrutura cloud para clientes e "
                                          "prestação de CISO as a Service, nas instalações de Coimbra e Luanda.", "cli"))
            if "iso27001-2022" in fws and not db.query(GapAssessment).filter_by(org_id=org.id).first():
                ga = run_gap_assessment(db, org.id, "iso27001-2022", create_tasks=False)
                print(f"gap assessment {ga.framework_id}: {ga.coverage_pct}% coverage, {len(ga.items)} items")
        elif args.cmd == "watch":
            print(asyncio.run(regulatory_watch(db)))
    finally:
        db.close()


if __name__ == "__main__":
    main()
