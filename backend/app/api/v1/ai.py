"""CISO Copilot, skill agents and the AI audit log."""
from __future__ import annotations

from datetime import UTC
from typing import Any

from fastapi import APIRouter, Depends

from app.ai.agents import CISOCopilot
from app.ai.agents.skills import SKILLS, SkillAgent
from app.ai.base import Message, ToolSpec
from app.ai.router import router as model_router
from app.api.deps import DB, Org, Who
from app.api.schemas import ChatIn, SkillAskIn
from app.core.security import require_roles
from app.db.models import AIAuditLog, Incident, Risk, Task, Vendor, Vulnerability
from app.services.gap_analysis import coverage_by_framework
from app.services.reporting import kpis

router = APIRouter(tags=["ai"])


def _tools(db, org, who) -> dict[str, tuple[ToolSpec, Any]]:
    async def get_kpis(_):
        return kpis(db, org.id)

    async def top_risks(args):
        n = int(args.get("limit", 10))
        return [{"id": r.id, "title": r.title, "level": r.level, "score": r.residual_score or r.inherent_score, "treatment": r.treatment, "owner": r.owner}
                for r in db.query(Risk).filter_by(org_id=org.id).order_by(Risk.inherent_score.desc()).limit(n).all()]

    async def open_incidents(_):
        return [{"id": i.id, "title": i.title, "severity": i.severity, "status": i.status, "dora_major": i.dora_major, "deadlines": i.notification_deadlines}
                for i in db.query(Incident).filter(Incident.org_id == org.id, Incident.status != "closed").all()]

    async def critical_vendors(_):
        return [{"id": v.id, "name": v.name, "tier": v.tier, "cif": v.supports_critical_function, "exit_strategy": v.exit_strategy,
                 "contract_end": v.contract_end, "residual": v.residual_score}
                for v in db.query(Vendor).filter(Vendor.org_id == org.id, Vendor.tier <= 2).all()]

    async def vulnerabilities(args):
        sev = args.get("severity")
        q = db.query(Vulnerability).filter_by(org_id=org.id, status="open")
        if sev:
            q = q.filter_by(severity=sev)
        return [{"cve": v.cve, "asset": v.asset_name, "severity": v.severity, "due_at": v.due_at} for v in q.limit(50).all()]

    async def coverage(_):
        return coverage_by_framework(db, org.id)

    async def overdue_tasks(_):
        from datetime import datetime

        now = datetime.now(UTC)
        return [{"id": t.id, "title": t.title, "due_at": t.due_at, "assignee": t.assignee, "priority": t.priority}
                for t in db.query(Task).filter(Task.org_id == org.id, Task.status != "done", Task.due_at < now).all()]

    async def create_task(args):
        if who.role not in ("ciso", "analyst"):
            return {"error": "role not allowed to create tasks"}
        t = Task(org_id=org.id, title=str(args.get("title", ""))[:500], description=str(args.get("description", "")), status="todo",
                 priority=args.get("priority", "medium"), assignee=args.get("assignee"))
        db.add(t)
        db.commit()
        return {"created": t.id}

    async def search_repository(args):
        from app.ai.agents.skills import retrieve

        return retrieve(db, str(args.get("query", "")), limit=15)

    spec = lambda n, d, props=None, req=None: ToolSpec(n, d, {"type": "object", "properties": props or {}, "required": req or []})
    return {
        "get_kpis": (spec("get_kpis", "Current KPIs for the organization: risks, incidents, vendors, evidence, controls, vulnerabilities, tasks, frameworks"), get_kpis),
        "top_risks": (spec("top_risks", "Highest-scored risks", {"limit": {"type": "integer"}}), top_risks),
        "open_incidents": (spec("open_incidents", "Open incidents with regulatory classification and deadlines"), open_incidents),
        "critical_vendors": (spec("critical_vendors", "Tier 1-2 ICT third parties with DORA fields"), critical_vendors),
        "vulnerabilities": (spec("vulnerabilities", "Open vulnerabilities, optionally by severity", {"severity": {"type": "string"}}), vulnerabilities),
        "framework_coverage": (spec("framework_coverage", "Implementation coverage per framework"), coverage),
        "overdue_tasks": (spec("overdue_tasks", "Tasks past their due date"), overdue_tasks),
        "search_repository": (spec("search_repository", "Search the standards and regulation repository", {"query": {"type": "string"}}, ["query"]), search_repository),
        "create_task": (spec("create_task", "Create a follow-up task (ciso/analyst only)", {"title": {"type": "string"}, "description": {"type": "string"},
                                                                                               "priority": {"type": "string"}, "assignee": {"type": "string"}}, ["title"]), create_task),
    }


@router.post("/copilot/chat")
async def chat(db: DB, org: Org, who: Who, body: ChatIn):
    history = [Message(m.role, m.content) for m in body.messages]
    history.insert(0, Message("user", f"[context] organization={org.name} country={org.country} kind={org.kind} user_role={who.role}"))
    return await CISOCopilot(_tools(db, org, who)).chat(db, history, who.sub, preferred=body.provider, org_id=org.id)


@router.get("/skills")
def skills(who: Who):
    return [{"skill": k, "description": v} for k, v in SKILLS.items()]


@router.post("/skills/ask")
async def ask(db: DB, org: Org, who: Who, body: SkillAskIn):
    return await SkillAgent().ask(db, body.skill, body.question, who.sub, org.id, body.framework_ids, body.provider,
                                  [Message(m.role, m.content) for m in body.history])


@router.get("/ai/providers")
def providers(who: Who):
    return {"available": model_router.available()}


@router.get("/ai/audit", dependencies=[Depends(require_roles("ciso", "auditor", "analyst"))])
def ai_audit(db: DB, org: Org, limit: int = 200):
    return [{"id": a.id, "at": a.at, "actor": a.actor, "agent": a.agent, "provider": a.provider, "model": a.model, "purpose": a.purpose,
             "input_tokens": a.input_tokens, "output_tokens": a.output_tokens, "latency_ms": a.latency_ms, "pii_redacted": a.pii_redacted,
             "human_decision": a.human_decision, "related_object": a.related_object}
            for a in db.query(AIAuditLog).filter(AIAuditLog.org_id == org.id).order_by(AIAuditLog.at.desc()).limit(limit).all()]


@router.post("/ai/audit/{log_id}/decision", dependencies=[Depends(require_roles("ciso", "analyst"))])
def decision(db: DB, org: Org, log_id: str, decision: str):
    row = db.query(AIAuditLog).filter_by(id=log_id, org_id=org.id).first()
    if row and decision in ("approved", "rejected", "edited"):
        row.human_decision = decision
        db.commit()
    return {"ok": bool(row)}
