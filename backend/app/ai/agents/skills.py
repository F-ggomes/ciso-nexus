"""Skill agents: technical Q&A grounded in the standards repository and the platform's own docs.

Skills:
  standards     - ISO 27001/27002/27005/22301/27701/27017/27018/42001 questions
  regulation    - DORA, NIS2 / DL 125/2025, GDPR / Lei 58/2019, EU AI Act, Angola (Lei 22/11, Lei 7/17, BNA), Banco de Portugal
  risk_controls - risk methods, control design, SoA, maturity, KPIs
  grc_ai        - AI governance (ISO 42001, NIST AI RMF, EU AI Act) and safe use of LLMs in GRC
  integrations  - how to configure APIs and connectors (Wazuh, Azure, M365, Jira, ServiceNow, CISO Assistant, SimpleRisk, Eramba,
                  OneTrust, Archer), permissions, troubleshooting

Grounding is retrieval over Requirement and KnowledgeDocument rows plus connector config schemas; the model must
cite refs and say when the repository does not contain the answer.
"""
from __future__ import annotations

import json
import re

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai.agents.prompts import BASE_FRAME
from app.ai.base import Message
from app.ai.router import router
from app.connectors.schemas import connector_schemas  # noqa: F401
from app.db.models import Framework, KnowledgeDocument, Requirement

SKILLS: dict[str, str] = {
    "standards": "Expert in ISO/IEC management-system standards. Explain requirements, Annex A controls, SoA logic, audit expectations "
                 "(ISO 19011), transition rules between editions. Distinguish 'shall' requirements from guidance.",
    "regulation": "Expert in EU and Portuguese/Angolan cyber and data regulation. Explain obligations, scope tests, deadlines, "
                  "competent authorities (CNCS, CNPD, Banco de Portugal, CMVM, ASF, APD, BNA, INACOM) and sanctions. Flag where national transposition detail must be verified.",
    "risk_controls": "Expert in ISO 27005, NIST SP 800-30, FAIR, EBIOS RM, control design and maturity (CMMI, C2M2), KPIs/KRIs, risk appetite.",
    "grc_ai": "Expert in AI governance: ISO/IEC 42001, NIST AI RMF, EU AI Act risk tiers, AI impact assessments, and safe LLM use in GRC "
              "(data minimisation, human-in-the-loop, audit logging, model risk).",
    "integrations": "Expert in configuring this platform's connectors and the vendor APIs behind them: required permissions, tokens, "
                    "network/TLS, rate limits, pagination, common errors. Give exact field names from the connector config schema.",
}

SKILL_SYSTEM = BASE_FRAME + """
Role: {skill_name} skill agent. {skill_brief}
You receive retrieved context from the standards repository (requirements with refs) and, for integrations, connector
configuration schemas. Answer precisely, cite refs as [framework ref], and if the retrieved context is insufficient say
"Not in repository" for that part and give general guidance clearly marked as such. End with 'Next step' (one line).
"""


def _keywords(q: str) -> list[str]:
    words = re.findall(r"[A-Za-zÀ-ú0-9.\-]{3,}", q)
    stop = {"the", "and", "for", "with", "what", "how", "does", "que", "para", "com", "como", "uma", "the", "this", "that"}
    return [w for w in words if w.lower() not in stop][:12]


def retrieve(db: Session, question: str, framework_ids: list[str] | None = None, limit: int = 25, org_id: str | None = None) -> list[dict]:
    kws = _keywords(question)
    hits: dict[str, dict] = {}
    for kw in kws:
        q = db.query(Requirement).filter(or_(Requirement.title.ilike(f"%{kw}%"), Requirement.text.ilike(f"%{kw}%"),
                                             Requirement.domain.ilike(f"%{kw}%"), Requirement.ref.ilike(f"%{kw}%")))
        if framework_ids:
            q = q.filter(Requirement.framework_id.in_(framework_ids))
        for r in q.limit(limit).all():
            key = f"{r.framework_id}:{r.ref}"
            hits.setdefault(key, {"framework": r.framework_id, "ref": r.ref, "title": r.title, "text": r.text[:600],
                                  "domain": r.domain, "crosswalk": r.crosswalk, "score": 0})
            hits[key]["score"] += 1
        dq = db.query(KnowledgeDocument).filter(or_(KnowledgeDocument.org_id.is_(None), KnowledgeDocument.org_id == org_id))
        for d in dq.filter(or_(KnowledgeDocument.title.ilike(f"%{kw}%"), KnowledgeDocument.text.ilike(f"%{kw}%"))).limit(5).all():
            key = f"doc:{d.id}"
            hits.setdefault(key, {"document": d.title, "framework": d.framework_id, "excerpt": d.text[:1200], "source_url": d.source_url, "score": 0})
            hits[key]["score"] += 1
    ranked = sorted(hits.values(), key=lambda h: -h["score"])[:limit]
    # Always include framework metadata for cited frameworks
    for fw in db.query(Framework).all():
        if any(h.get("framework") == fw.id for h in ranked):
            ranked.append({"framework_meta": fw.id, "name": fw.name, "version": fw.version, "effective_date": fw.effective_date,
                           "source_url": fw.source_url, "licensed_text": fw.licensed_text})
    return ranked



class SkillAgent:
    agent = "skill"

    async def ask(self, db: Session | None, skill: str, question: str, actor: str, org_id: str | None = None,
                  framework_ids: list[str] | None = None, preferred=None, history: list[Message] | None = None) -> dict:
        if skill not in SKILLS:
            raise ValueError(f"Unknown skill {skill}; choose from {list(SKILLS)}")
        context: dict = {"question": question}
        if db is not None and skill != "integrations":
            context["retrieved"] = retrieve(db, question, framework_ids, org_id=org_id)
        if skill == "integrations":
            context["connector_schemas"] = connector_schemas()
        system = SKILL_SYSTEM.format(skill_name=skill, skill_brief=SKILLS[skill])
        messages = list(history or []) + [Message("user", json.dumps(context, ensure_ascii=False, default=str))]
        completion = await router.run(db, agent=f"skill_{skill}", purpose="skill_qa", system=system, messages=messages, actor=actor,
                                      preferred=preferred, org_id=org_id)
        return {"answer": completion.text, "skill": skill, "provider": completion.provider, "model": completion.model,
                "sources": [h for h in context.get("retrieved", []) if "ref" in h][:15]}
