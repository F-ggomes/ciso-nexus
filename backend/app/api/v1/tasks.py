"""Agile work management: Kanban tasks, sprints, notifications/reminders."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import DB, Org, Who
from app.api.schemas import TaskIn, TaskUpdate
from app.core.security import require_roles
from app.db.models import Notification, Task
from app.services.reminders import collect_due, deliver

router = APIRouter(tags=["tasks & notifications"])
_RECUR_DAYS = {"monthly": 30, "quarterly": 91, "annual": 365}


def _out(t: Task) -> dict:
    return {"id": t.id, "title": t.title, "description": t.description, "status": t.status, "priority": t.priority, "assignee": t.assignee,
            "sprint": t.sprint, "story_points": t.story_points, "due_at": t.due_at, "recurrence": t.recurrence, "related_kind": t.related_kind,
            "related_id": t.related_id, "ticket_ref": t.ticket_ref, "completed_at": t.completed_at, "created_at": t.created_at,
            "overdue": bool(t.due_at and t.status != "done" and t.due_at < datetime.now(UTC))}


@router.get("/tasks")
def list_tasks(db: DB, org: Org, status: str | None = None, sprint: str | None = None, assignee: str | None = None, related_kind: str | None = None):
    q = db.query(Task).filter_by(org_id=org.id)
    for k, v in (("status", status), ("sprint", sprint), ("assignee", assignee), ("related_kind", related_kind)):
        if v:
            q = q.filter(getattr(Task, k) == v)
    return [_out(t) for t in q.order_by(Task.due_at.asc().nullslast(), Task.priority).all()]


@router.get("/tasks/board")
def board(db: DB, org: Org, sprint: str | None = None):
    q = db.query(Task).filter_by(org_id=org.id)
    if sprint:
        q = q.filter_by(sprint=sprint)
    cols: dict[str, list[dict[str, Any]]] = {s: [] for s in ("backlog", "todo", "doing", "review", "done")}
    for t in q.all():
        cols.setdefault(t.status, []).append(_out(t))
    sprints = sorted({t.sprint for t in db.query(Task).filter_by(org_id=org.id).all() if t.sprint})
    return {"columns": cols, "sprints": sprints}


@router.post("/tasks", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def create_task(db: DB, org: Org, body: TaskIn):
    t = Task(org_id=org.id, **body.model_dump())
    db.add(t)
    db.commit()
    return _out(t)


@router.patch("/tasks/{task_id}", dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def update_task(db: DB, org: Org, task_id: str, body: TaskUpdate):
    t = db.query(Task).filter_by(org_id=org.id, id=task_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    if body.status == "done" and not t.completed_at:
        t.completed_at = datetime.now(UTC)
        if t.recurrence:  # spawn the next occurrence
            nxt = Task(org_id=org.id, title=t.title, description=t.description, status="todo", priority=t.priority, assignee=t.assignee,
                       recurrence=t.recurrence, related_kind=t.related_kind, related_id=t.related_id,
                       due_at=(t.due_at or datetime.now(UTC)) + timedelta(days=_RECUR_DAYS[t.recurrence]))
            db.add(nxt)
    db.commit()
    return _out(t)


@router.get("/notifications")
def notifications(db: DB, org: Org, who: Who, unread_only: bool = True, limit: int = 100):
    q = db.query(Notification).filter(Notification.org_id == org.id,
                                      (Notification.user_email == who.sub) | (Notification.user_email.is_(None)))
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return [{"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "related_kind": n.related_kind, "related_id": n.related_id,
             "created_at": n.created_at, "read_at": n.read_at, "delivered": n.delivered} for n in q.order_by(Notification.created_at.desc()).limit(limit).all()]


@router.post("/notifications/{notification_id}/read")
def mark_read(db: DB, org: Org, notification_id: str):
    n = db.query(Notification).filter_by(org_id=org.id, id=notification_id).first()
    if not n:
        raise HTTPException(404, "Not found")
    n.read_at = datetime.now(UTC)
    db.commit()
    return {"ok": True}


@router.post("/notifications/run", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def run_reminders(db: DB, org: Org):
    created = collect_due(db, org.id)
    delivered = await deliver(db, org.id, created)
    return {"created": len(created), "delivered": delivered}
