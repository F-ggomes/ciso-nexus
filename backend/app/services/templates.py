"""Document templates (policies, procedures, processes) in pt-PT.

Templates live in app/content/templates/*.md with YAML-ish front matter (kind, code, title, language).
Files starting with `_` are the generic model for a kind; files named by code (POL-01.md) are
specific. `render()` fills {{PLACEHOLDERS}} from the organization, scope and the document's
requirement refs. The rendered text seeds version 1 at bootstrap and is passed to the AI Policy Writer
as the structure to follow, so generated documents keep the house format and the requirement matrix.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "content" / "templates"
_FRONT = re.compile(r"^---\n(.*?)\n---\n", re.S)


def _parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    meta: dict[str, str] = {}
    m = _FRONT.match(raw)
    body = raw
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        body = raw[m.end():]
    return {"file": path.name, "kind": meta.get("kind", "policy"), "code": meta.get("code"), "title": meta.get("title", path.stem),
            "language": meta.get("language", "pt-PT"), "generic": path.name.startswith("_"), "body": body}


def list_templates(extra_dir: str | None = None) -> list[dict]:
    dirs = [TEMPLATE_DIR] + ([Path(extra_dir)] if extra_dir else [])
    out = []
    for d in dirs:
        if d.exists():
            out += [_parse(p) for p in sorted(d.glob("*.md"))]
    return out


def find_template(code: str | None, kind: str, extra_dir: str | None = None) -> dict | None:
    templates = list_templates(extra_dir)
    if code:
        for t in templates:
            if t["code"] == code:
                return t
    for t in templates:
        if t["generic"] and t["kind"] == kind:
            return t
    return None


def render(template: dict, *, org_name: str, code: str, title: str, requirement_refs: list[dict], requirement_titles: dict[str, str],
           scope_statement: str = "", appetite: dict | None = None, owner: str = "", author: str = "", version: int = 1,
           review_cycle_months: int = 12) -> str:
    now = datetime.now(timezone.utc)
    refs_lines = "\n".join(f"- {r['framework_id']} {r['ref']} — {requirement_titles.get(r['framework_id'] + ':' + r['ref'], '')}".rstrip(" —")
                           for r in requirement_refs) or "- [a confirmar]"
    matrix = "\n".join(f"| {r['framework_id']} {r['ref']} | [secção] |" for r in requirement_refs) or "| [a confirmar] | |"
    appetite = appetite or {"accept_below": 6, "escalate_at": 15}
    values = {
        "TITLE": title, "CODE": code, "ORG": org_name, "VERSION": str(version), "DATE": now.strftime("%Y-%m-%d"),
        "NEXT_REVIEW": (now + timedelta(days=30 * max(1, review_cycle_months))).strftime("%Y-%m-%d"),
        "REVIEW_CYCLE": str(review_cycle_months), "OWNER": owner or "CISO", "APPROVER": "Administração", "AUTHOR": author or "CISO Nexus",
        "REQUIREMENTS": refs_lines, "REQUIREMENT_MATRIX": matrix, "SCOPE": scope_statement or "[Âmbito do SGSI aprovado]",
        "ACCEPT_BELOW": str(appetite.get("accept_below", 6)), "ESCALATE_AT": str(appetite.get("escalate_at", 15)),
    }
    body = template["body"].replace("{{TITLE}}", title)
    for k, v in values.items():
        body = body.replace("{{" + k + "}}", v)
    return body


def render_for_policy(db: "Session", org, policy, scope_statement: str = "", appetite: dict | None = None, author: str = "") -> str:
    from app.db.models import Requirement

    titles: dict[str, str] = {}
    for r in policy.requirement_refs or []:
        req = db.query(Requirement).filter_by(framework_id=r["framework_id"], ref=r["ref"]).first()
        if req:
            titles[f"{r['framework_id']}:{r['ref']}"] = req.title
    tpl = find_template(policy.code, policy.doc_kind) or {"body": "# {{TITLE}}\n\n{{REQUIREMENTS}}\n", "kind": policy.doc_kind}
    return render(tpl, org_name=org.name, code=policy.code, title=policy.title, requirement_refs=policy.requirement_refs or [],
                  requirement_titles=titles, scope_statement=scope_statement, appetite=appetite, owner=policy.owner or "",
                  author=author, version=policy.current_version, review_cycle_months=policy.review_cycle_months)
