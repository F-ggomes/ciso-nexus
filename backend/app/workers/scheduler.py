"""Background jobs (APScheduler): evidence/finding sync, reminders, regulatory watch, recurring tasks."""
from __future__ import annotations

import asyncio

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.models import Organization
from app.db.session import SessionLocal

log = get_logger(__name__)
scheduler = BackgroundScheduler(timezone="UTC")


def _job_sync_all():
    from app.services.sync import sync_all

    db = SessionLocal()
    try:
        for org in db.query(Organization).all():
            try:
                asyncio.run(sync_all(db, org.id))
            except Exception as exc:  # noqa: BLE001 - one org failure must not abort other orgs
                log.error("job.sync.failed", org=org.id, error=str(exc)[:200])
    finally:
        db.close()


def _job_reminders():
    from app.services.reminders import run_for_all_orgs

    db = SessionLocal()
    try:
        log.info("job.reminders", **asyncio.run(run_for_all_orgs(db)))
    finally:
        db.close()


def _job_regulatory_watch():
    from app.services.repository import regulatory_watch

    db = SessionLocal()
    try:
        op = db.query(Organization).filter_by(kind="operator").first()
        changes = asyncio.run(regulatory_watch(db, op.id if op else None))
        log.info("job.watch", changes=len(changes))
    finally:
        db.close()


def start() -> None:
    s = get_settings()
    if not s.scheduler_enabled or scheduler.running:
        return
    scheduler.add_job(_job_sync_all, CronTrigger.from_crontab(s.evidence_sync_cron), id="sync_all", replace_existing=True)
    scheduler.add_job(_job_reminders, CronTrigger.from_crontab("0 7 * * *"), id="reminders", replace_existing=True)
    scheduler.add_job(_job_regulatory_watch, CronTrigger.from_crontab("0 6 * * 1"), id="regulatory_watch", replace_existing=True)
    scheduler.start()
    log.info("scheduler.started", jobs=[j.id for j in scheduler.get_jobs()])


def stop() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
