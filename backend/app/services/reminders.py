"""Reminders and notifications for pending work: tasks, policy reviews, vendor reassessments,
risk reviews, vulnerability SLAs and regulatory notification deadlines.

Delivery: in-app always; Teams when configured for the organization; Jira ticket for overdue critical items.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.connectors.base import ITSMConnector
from app.connectors.registry import registry
from app.core.logging import get_logger
from app.db.models import Incident, Notification, Organization, Policy, Risk, Task, Vendor, Vulnerability

log = get_logger(__name__)


def _notify(db: Session, org_id: str, title: str, body: str, kind: str, related_kind: str, related_id: str,
            user: str | None = None) -> Notification | None:
    recent = datetime.now(UTC) - timedelta(hours=23)
    if db.query(Notification).filter(Notification.org_id == org_id, Notification.kind == kind, Notification.related_kind == related_kind,
                                     Notification.related_id == related_id, Notification.created_at >= recent).first():
        return None  # one notification per object per day
    n = Notification(org_id=org_id, user_email=user, kind=kind, title=title[:512], body=body, related_kind=related_kind, related_id=related_id)
    db.add(n)
    return n


def collect_due(db: Session, org_id: str, now: datetime | None = None) -> list[Notification]:
    now = now or datetime.now(UTC)
    created: list[Notification] = []

    def _add(title: str, body: str, kind: str, related_kind: str, related_id: str, user: str | None = None) -> None:
        n = _notify(db, org_id, title, body, kind, related_kind, related_id, user)
        if n is not None:
            created.append(n)

    # Tasks: reminders N days before and when overdue (at most once a day)
    for t in db.query(Task).filter(Task.org_id == org_id, Task.status != "done", Task.due_at.isnot(None)).all():
        if t.due_at is None:
            continue
        days_left = (t.due_at - now).days
        hit = days_left < 0 or days_left in (t.reminder_days_before or [7, 1])
        recently = t.last_reminded_at and (now - t.last_reminded_at) < timedelta(hours=23)
        if hit and not recently:
            state = "OVERDUE" if days_left < 0 else f"due in {days_left} day(s)"
            _add(f"Task {state}: {t.title}", t.description or "", "reminder", "task", t.id, t.assignee)
            t.last_reminded_at = now
    # Policies due for review
    for p in db.query(Policy).filter(Policy.org_id == org_id, Policy.next_review_at.isnot(None), Policy.next_review_at <= now + timedelta(days=30)).all():
        if p.next_review_at:
            _add(f"Policy review due: {p.code} {p.title}", f"Next review {p.next_review_at:%Y-%m-%d}", "review", "policy", p.id, p.owner)
    # Vendor reassessments and contract ends
    for v in db.query(Vendor).filter(Vendor.org_id == org_id).all():
        if v.next_assessment_at and v.next_assessment_at <= now + timedelta(days=30):
            _add(f"Vendor reassessment due: {v.name}", f"Tier {v.tier}; due {v.next_assessment_at:%Y-%m-%d}", "review", "vendor", v.id)
        if v.contract_end and v.contract_end <= now + timedelta(days=90):
            _add(f"Contract ending: {v.name}", f"Ends {v.contract_end:%Y-%m-%d}; exit strategy: {v.exit_strategy}", "contract", "vendor", v.id)
    # Risk reviews and accepted-risk expiry
    for r in db.query(Risk).filter(Risk.org_id == org_id, Risk.treatment != "closed").all():
        if r.review_at and r.review_at <= now + timedelta(days=14):
            _add(f"Risk review due: {r.title}", f"Level {r.level}", "review", "risk", r.id, r.owner)
        if r.accepted_until and r.accepted_until <= now + timedelta(days=14):
            _add(f"Risk acceptance expiring: {r.title}", f"Accepted until {r.accepted_until:%Y-%m-%d}", "review", "risk", r.id, r.owner)
    # Vulnerability SLA breaches
    for vu in db.query(Vulnerability).filter(Vulnerability.org_id == org_id, Vulnerability.status == "open", Vulnerability.due_at.isnot(None), Vulnerability.due_at < now).limit(50).all():
        _add(f"Vulnerability SLA breached: {vu.cve or vu.title[:60]} on {vu.asset_name}", f"Severity {vu.severity}", "sla", "vulnerability", vu.id)
    # Regulatory notification deadlines
    for inc in db.query(Incident).filter(Incident.org_id == org_id, Incident.status != "closed").all():
        for d in inc.notification_deadlines or []:
            try:
                due = datetime.fromisoformat(d["due"])
            except (ValueError, TypeError, KeyError):
                continue
            if now <= due <= now + timedelta(hours=12) or due < now:
                _add(f"Regulatory deadline {'PASSED' if due < now else 'within 12h'}: {d['regime']}",
                     f"Incident: {inc.title}. Basis: {d.get('basis', '')}", "regulatory", "incident", inc.id)
    db.commit()
    return created


async def deliver(db: Session, org_id: str, notifications: list[Notification]) -> int:
    """Push undelivered notifications to Teams (all) and Jira (regulatory/overdue critical)."""
    conns = registry.for_org(db, org_id)
    teams = conns.get("teams")
    jira = conns.get("jira")
    delivered = 0
    for n in notifications:
        if n.delivered:
            continue
        try:
            if isinstance(teams, ITSMConnector) and teams.configured():
                sev = "critical" if n.kind == "regulatory" or "OVERDUE" in n.title else "medium"
                await teams.notify(n.title, n.body, sev)
            if n.kind == "regulatory" and isinstance(jira, ITSMConnector) and jira.configured():
                await jira.create_ticket(n.title, n.body, "critical", ["regulatory"])
            n.delivered = True
            delivered += 1
        except Exception as exc:  # noqa: BLE001 - third-party notification failure must not block delivery to other channels
            log.warning("notification.delivery_failed", notification_id=n.id, error=str(exc)[:200])
            continue
    db.commit()
    return delivered


async def run_for_all_orgs(db: Session) -> dict:
    total = {"created": 0, "delivered": 0}
    for org in db.query(Organization).all():
        created = collect_due(db, org.id)
        total["created"] += len(created)
        total["delivered"] += await deliver(db, org.id, created)
    return total
