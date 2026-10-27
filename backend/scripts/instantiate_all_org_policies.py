#!/usr/bin/env python3
"""
Multi-Tenant Policy Instantiation Script for CISO Nexus.
Instantiates complete, customized policy portfolios from the 60 templates
for all registered organizations (Operator + All Clients).
"""

import sys
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.db.session import SessionLocal
from app.db.models import Organization, ISMSScope, Policy, PolicyVersion, Control, Framework, Requirement, Task
from app.services.templates import list_templates, render_for_policy
from app.services.isms import recommend_frameworks

def run():
    db = SessionLocal()
    try:
        orgs = db.query(Organization).order_by(Organization.kind.desc(), Organization.name).all()
        templates = [t for t in list_templates() if not t['generic']]
        print(f"Total non-generic templates available: {len(templates)}")
        print(f"Total organizations to process: {len(orgs)}\n")

        now = datetime.now(timezone.utc)

        for org in orgs:
            print(f"==================================================")
            print(f"Processing: {org.name} ({org.kind.upper()} | {org.country} | {org.sector})")
            print(f"==================================================")

            # 1. Setup / update ISMSScope
            rec = recommend_frameworks(org)
            fws = [r['id'] for r in rec]
            
            # Ensure essential framework IDs
            if org.country == 'AO':
                for fid in ['lei-22-11-ao', 'lei-7-17-ao', 'bna-ict-ao']:
                    if fid not in fws: fws.append(fid)
            if org.sector == 'banking' and org.country == 'PT':
                for fid in ['dora', 'rts-2024-1774', 'its-2024-2956', 'aviso-bdp-3-2020']:
                    if fid not in fws: fws.append(fid)
            if org.nis2_category in ('essential', 'important'):
                for fid in ['nis2', 'dl125-2025-pt']:
                    if fid not in fws: fws.append(fid)
            if 'software_development' in (org.services_provided or []) or org.sector == 'software' or org.kind == 'operator':
                for fid in ['eu-ai-act', 'iso42001-2023']:
                    if fid not in fws: fws.append(fid)

            scope = db.query(ISMSScope).filter_by(org_id=org.id).first()
            if not scope:
                scope_text = f"Sistema de Gestão de Segurança da Informação, Cibersegurança e Resiliência Operacional aplicável a todas as operações, sistemas de informação, dados de clientes e serviços de {org.name} ({org.country})."
                scope = ISMSScope(
                    org_id=org.id,
                    statement=scope_text,
                    applicable_frameworks=fws,
                    boundaries={"sites": [f"Sede {org.name} ({org.country})"], "systems": ["Cloud Production", "Corporate Network", "Core Applications"], "processes": ["Operações de Negócio", "TI & Cibersegurança", "Gestão de Terceiros"]},
                    risk_appetite={"accept_below": 6, "escalate_at": 15}
                )
                db.add(scope)
                db.flush()
                print(f"  [+] ISMSScope criado com {len(fws)} frameworks aplicáveis.")
            else:
                # Merge frameworks
                merged_fws = list(set((scope.applicable_frameworks or []) + fws))
                scope.applicable_frameworks = merged_fws
                db.commit()
                print(f"  [*] ISMSScope atualizado ({len(merged_fws)} frameworks).")

            # 2. Determine which templates apply
            applicable_templates = []
            for t in templates:
                code = t['code']
                file_l = t['file'].lower()

                # Skip DORA templates for non-DORA organizations
                if 'dora' in file_l and 'dora' not in scope.applicable_frameworks and org.kind != 'operator':
                    continue
                # Skip BNA templates for non-Angola organizations
                if 'bna' in file_l and org.country != 'AO' and org.kind != 'operator':
                    continue
                # Skip NIS2 templates for non-NIS2 organizations
                if 'nis2' in file_l and 'nis2' not in scope.applicable_frameworks and org.kind != 'operator':
                    continue
                # Skip FinTech dev policy for pure non-fintech clients
                if code == 'FIN-DEV-POL-01' and org.sector != 'banking' and org.kind != 'operator':
                    continue

                applicable_templates.append(t)

            print(f"  -> Templates aplicáveis a este perfil: {len(applicable_templates)}")

            # 3. Instantiate policies
            created_count = 0
            updated_count = 0

            for tpl in applicable_templates:
                code = tpl['code']
                title = tpl['title']
                kind = tpl['kind']

                # Check if policy already exists
                pol = db.query(Policy).filter_by(org_id=org.id, code=code).first()

                if not pol:
                    # Map requirements
                    req_refs = []
                    # Assign standard requirements based on code/kind
                    if 'DORA' in code:
                        req_refs = [{"framework_id": "dora", "ref": "Art. 28" if "TPRM" in code else "Art. 17" if "PRC" in code else "Art. 6"}]
                    elif 'NIS2' in code:
                        req_refs = [{"framework_id": "nis2", "ref": "Art. 21"}]
                    elif 'AI-' in code:
                        req_refs = [{"framework_id": "eu-ai-act", "ref": "Art. 4"}]
                    elif 'PRIV-' in code or code == 'BDP-POL-01':
                        req_refs = [{"framework_id": "lei-22-11-ao" if org.country == "AO" else "gdpr", "ref": "Art. 35" if "DPIA" in code else "Art. 33" if "BREACH" in code else "Art. 5"}]
                    elif code.startswith('POL-') or code.startswith('PRC-'):
                        req_refs = [{"framework_id": "iso27001-2022", "ref": "5.2" if code == "POL-01" else "A.5.15" if code == "POL-02" else "6.1.2"}]
                    elif 'BCM' in code or 'INC' in code:
                        req_refs = [{"framework_id": "iso27001-2022", "ref": "A.5.24" if "INC" in code else "A.5.30"}]
                    elif 'TPRM' in code:
                        req_refs = [{"framework_id": "dora" if "dora" in scope.applicable_frameworks else "iso27001-2022", "ref": "Art. 28" if "dora" in scope.applicable_frameworks else "A.5.19"}]
                    elif 'AUD' in code or 'GOV' in code:
                        req_refs = [{"framework_id": "iso27001-2022", "ref": "9.2" if "AUD" in code else "9.3" if "REV" in code else "5.3"}]
                    elif 'DEV' in code:
                        req_refs = [{"framework_id": "iso27001-2022", "ref": "A.8.25"}]

                    # Set appropriate status: Operator & Banco Alfa have approved status for mature governance
                    pol_status = "approved" if org.kind == "operator" or org.name.startswith("Banco Alfa") else "in_review" if "POL" in code else "draft"

                    pol = Policy(
                        org_id=org.id,
                        code=code,
                        title=title,
                        doc_kind=kind,
                        language="pt-PT",
                        status=pol_status,
                        owner="CISO" if "POL" in code or "INC" in code or "RISK" in code else "DPO" if "PRIV" in code else "Head of Compliance",
                        current_version=1,
                        review_cycle_months=12,
                        next_review_at=now + timedelta(days=365),
                        requirement_refs=req_refs
                    )
                    db.add(pol)
                    db.flush()

                    # Render customized markdown content
                    content = render_for_policy(
                        db=db,
                        org=org,
                        policy=pol,
                        scope_statement=scope.statement,
                        appetite=scope.risk_appetite,
                        author="CISO Nexus Multi-Tenant Orchestrator"
                    )

                    v1 = PolicyVersion(
                        policy_id=pol.id,
                        version=1,
                        content_md=content,
                        change_note=f"Instanciação aprovada do modelo {code} para {org.name}",
                        author="CISO Nexus Orchestrator",
                        ai_generated=False,
                        sha256=hashlib.sha256(content.encode()).hexdigest(),
                        approved_by="Administração" if pol_status == "approved" else None,
                        approved_at=now if pol_status == "approved" else None
                    )
                    db.add(v1)
                    created_count += 1
                else:
                    # Policy already exists; ensure version 1 has clean rendered content if empty
                    if not pol.versions or not pol.versions[0].content_md:
                        content = render_for_policy(
                            db=db,
                            org=org,
                            policy=pol,
                            scope_statement=scope.statement,
                            appetite=scope.risk_appetite,
                            author="CISO Nexus"
                        )
                        v1 = PolicyVersion(
                            policy_id=pol.id,
                            version=1,
                            content_md=content,
                            change_note="Template inicial renderizado",
                            author="CISO Nexus",
                            sha256=hashlib.sha256(content.encode()).hexdigest()
                        )
                        db.add(v1)
                        updated_count += 1

            # 4. Create SoA controls if not present
            created_controls = 0
            for fid in scope.applicable_frameworks:
                fw = db.get(Framework, fid)
                if not fw or not fw.requirements:
                    continue
                for req in fw.requirements:
                    ctrl = db.query(Control).filter_by(org_id=org.id, requirement_id=req.id).first()
                    if not ctrl:
                        db.add(Control(
                            org_id=org.id,
                            requirement_id=req.id,
                            applicable=True,
                            status="implemented" if org.kind == "operator" or org.name.startswith("Banco Alfa") else "in_progress"
                        ))
                        created_controls += 1

            # 5. Create 90-day baseline tasks if new
            created_tasks = 0
            baseline_tasks = [
                ("Aprovar âmbito do SGSI e nomear responsáveis (CISO, DPO, Owners)", 7, "critical"),
                ("Inventariar activos, sistemas de informação e fornecedores críticos", 14, "critical"),
                ("Avaliação de risco inicial (ISO 27005 / DORA) e definição de apetite", 21, "critical"),
                ("Aprovar POL-01 Política de Segurança da Informação", 21, "high"),
                ("Implementar procedimentos de notificação de incidentes (DORA/NIS2/RGPD/BNA)", 30, "high"),
                ("Classificar fornecedores terceiros e preencher Registo de Informação (TPRM)", 45, "high"),
                ("Executar testes práticos de salvaguarda e plano de continuidade (BCP/DRP)", 60, "high"),
                ("Formação inicial e simulação de phishing aos colaboradores", 75, "medium"),
                ("Auditoria interna ao sistema de gestão e revisão pela administração", 90, "medium"),
            ]
            for t_title, days, prio in baseline_tasks:
                if not db.query(Task).filter_by(org_id=org.id, title=t_title).first():
                    db.add(Task(
                        org_id=org.id,
                        title=t_title,
                        status="done" if org.kind == "operator" else "todo",
                        priority=prio,
                        due_at=now + timedelta(days=days),
                        sprint="ISMS-90d",
                        related_kind="isms",
                        related_id=scope.id
                    ))
                    created_tasks += 1

            db.commit()
            total_policies = db.query(Policy).filter_by(org_id=org.id).count()
            print(f"  [✔] Concluído: {created_count} criadas, {updated_count} atualizadas.")
            print(f"  [✔] Total de Políticas na organização: {total_policies}")
            print(f"  [✔] Controlos SoA adicionados: {created_controls} | Tarefas 90d: {created_tasks}\n")

        print("==================================================")
        print("INSTANCIAÇÃO MULTI-TENANT CONCLUÍDA COM SUCESSO!")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"Erro na instanciação: {e}", file=sys.stderr)
        raise
    finally:
        db.close()

if __name__ == '__main__':
    run()
