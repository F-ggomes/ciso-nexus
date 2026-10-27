"""Standards repository: content-pack loader, versioning and regulatory watch.

Content packs are JSON files in app/content/packs (shipped) plus any directory named in
NEXUS_CONTENT_DIR (customer-maintained). Loading is idempotent: a pack whose `pack_version`
is unchanged is skipped; a newer version upserts requirements and keeps crosswalks.
Licensed texts (ISO) carry refs and titles only; the full text stays with the licence holder.
Full texts and summaries are Markdown files in app/content/texts (public-domain or freely reusable
texts, and original summaries of licensed ones). A licence holder can add the licensed full text as
Markdown under NEXUS_CONTENT_DIR, which is mounted at runtime and never committed or baked into images.

Regulatory watch: for frameworks with a source_url, fetch the page, hash it, and flag a
change when the hash differs from the stored one. A change creates a review task for the CISO;
it never auto-edits requirements, because legal text needs a human reading.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.models import Framework, KnowledgeDocument, Requirement, Task
from app.services.refs import parent_refs

log = get_logger(__name__)
PACK_DIR = Path(__file__).resolve().parent.parent / "content" / "packs"
TEXT_DIR = Path(__file__).resolve().parent.parent / "content" / "texts"


def _iter_packs() -> list[dict]:
    dirs = [PACK_DIR]
    extra = os.getenv("NEXUS_CONTENT_DIR")
    if extra:
        dirs.append(Path(extra))
    packs: list[dict] = []
    for d in dirs:
        if not d.exists():
            continue
        for f in sorted(d.glob("*.json")):
            data = json.loads(f.read_text(encoding="utf-8"))
            packs.extend(data if isinstance(data, list) else [data])
    return packs


def load_content_packs(db: Session, force: bool = False) -> dict[str, str]:
    """Upsert frameworks and requirements. Returns {framework_id: 'loaded'|'updated'|'unchanged'}."""
    result: dict[str, str] = {}
    for pack in _iter_packs():
        fw = db.get(Framework, pack["id"])
        incoming_version = str(pack.get("pack_version", "0"))
        if fw and fw.content_pack_version == incoming_version and not force:
            result[pack["id"]] = "unchanged"
            continue
        status = "updated" if fw else "loaded"
        if not fw:
            fw = Framework(id=pack["id"])
            db.add(fw)
        for attr in ("name", "kind", "jurisdiction", "issuer", "version", "effective_date", "source_url", "supersedes"):
            setattr(fw, attr, pack.get(attr) or ("" if attr != "effective_date" and attr != "supersedes" else None))
        fw.licensed_text = bool(pack.get("licensed_text"))
        fw.content_pack_version = incoming_version
        db.flush()
        existing = {r.ref: r for r in db.query(Requirement).filter_by(framework_id=fw.id).all()}
        for req in pack.get("requirements", []):
            row = existing.get(req["ref"])
            if not row:
                row = Requirement(framework_id=fw.id, ref=req["ref"])
                db.add(row)
            row.title = req.get("title", "")
            row.text = req.get("text", "")
            row.domain = req.get("domain", "")
            row.kind = req.get("kind", "control")
            row.tags = req.get("tags", [])
            row.crosswalk = req.get("crosswalk", [])
        result[pack["id"]] = status
    db.flush()
    result["texts"] = load_texts(db)
    db.commit()
    log.info("content.packs", result=result)
    return result


# Preference when several documents cover a framework: the licence holder's own full text first.
_DOC_RANK = {("legal_text", "pt-PT"): 0, ("legal_text", "en"): 1, ("summary", "pt-PT"): 2, ("summary", "en"): 3}
_SECTION = re.compile(r"^## \[([^\]]+)\][^\n]*\n", re.M)


def _parse_text_file(raw: str) -> tuple[dict, str]:
    meta: dict[str, str] = {}
    if raw.startswith("---\n"):
        head, _, raw = raw[4:].partition("\n---\n")
        for line in head.splitlines():
            k, sep, v = line.partition(":")
            if sep:
                meta[k.strip()] = v.strip()
    return meta, raw.strip()


def _sections(body: str) -> dict[str, str]:
    marks = list(_SECTION.finditer(body))
    return {m.group(1): body[m.end():marks[i + 1].start() if i + 1 < len(marks) else len(body)].strip()
            for i, m in enumerate(marks)}


def load_texts(db: Session) -> str:
    """Upsert full texts and summaries (app/content/texts and NEXUS_CONTENT_DIR) as global repository
    documents, then copy each requirement's section into Requirement.text."""
    files = sorted(TEXT_DIR.glob("*.md"))
    extra = os.getenv("NEXUS_CONTENT_DIR")
    if extra and Path(extra).exists():
        files += sorted(Path(extra).rglob("*.md"))
    best: dict[str, tuple[int, dict[str, str]]] = {}
    changed = 0
    for f in files:
        meta, body = _parse_text_file(f.read_text(encoding="utf-8"))
        fid, lang, kind = meta.get("framework_id"), meta.get("language", "pt-PT"), meta.get("doc_type", "legal_text")
        if not fid or not db.get(Framework, fid):
            continue
        digest = hashlib.sha256(body.encode()).hexdigest()
        doc = db.query(KnowledgeDocument).filter_by(org_id=None, framework_id=fid, language=lang, doc_type=kind).first()
        if not doc or doc.sha256 != digest:
            doc = doc or KnowledgeDocument(org_id=None, framework_id=fid, language=lang, doc_type=kind)
            doc.title, doc.text, doc.sha256 = meta.get("title", fid), body, digest
            doc.source_url, doc.file_path = meta.get("source_url", ""), f.name
            doc.tags = [t for t in (kind, meta.get("licence", "")[:60]) if t]
            db.add(doc)
            changed += 1
        rank = _DOC_RANK.get((kind, lang), 9)
        if fid not in best or rank < best[fid][0]:
            best[fid] = (rank, _sections(body))
    for fid, (_, secs) in best.items():
        for req in db.query(Requirement).filter_by(framework_id=fid).all():
            req.text = next((secs[r] for r in parent_refs(req.ref) if r in secs), req.text)
    return f"{len(files)} files, {changed} updated"


async def regulatory_watch(db: Session, org_id_for_tasks: str | None = None, timeout: float = 20.0) -> list[dict]:
    """Detect changes at source URLs. Creates one review task per changed framework."""
    changes: list[dict] = []
    frameworks = db.query(Framework).filter(Framework.source_url != "").all()
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True,
                                 headers={"User-Agent": "CISO-Nexus regulatory-watch/0.1"}) as client:
        for fw in frameworks:
            try:
                r = await client.get(fw.source_url)
                digest = hashlib.sha256(r.content).hexdigest()
            except Exception as exc:
                log.warning("watch.fetch_failed", framework=fw.id, error=str(exc)[:200])
                continue
            fw.last_checked_at = datetime.now(timezone.utc)
            if fw.source_sha256 and fw.source_sha256 != digest:
                changes.append({"framework_id": fw.id, "name": fw.name, "source_url": fw.source_url})
                if org_id_for_tasks:
                    db.add(Task(org_id=org_id_for_tasks, title=f"Review possible update: {fw.name}",
                                description=f"The source page {fw.source_url} changed since the last check. "
                                            "Read the change, update the content pack and bump pack_version if requirements changed.",
                                status="todo", priority="high", related_kind="framework", related_id=fw.id))
            fw.source_sha256 = digest
    db.commit()
    return changes


def framework_summary(db: Session) -> list[dict]:
    out = []
    for fw in db.query(Framework).order_by(Framework.jurisdiction, Framework.id).all():
        out.append({"id": fw.id, "name": fw.name, "kind": fw.kind, "jurisdiction": fw.jurisdiction, "version": fw.version,
                    "issuer": fw.issuer, "effective_date": fw.effective_date, "source_url": fw.source_url,
                    "requirements": len(fw.requirements), "licensed_text": fw.licensed_text,
                    "pack_version": fw.content_pack_version, "last_checked_at": fw.last_checked_at})
    return out
