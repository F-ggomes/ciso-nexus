"""Canonical data model.

CISO Nexus is a multi-tenant orchestration and ISMS platform. `Organization` is the tenant: the
operating company (Tobe/Selenium) and each CISO-as-a-Service client is one organization. Every
business object carries `org_id`. Objects that mirror an external GRC record keep
(external_system, external_id) for traceability back to CISO Assistant, SimpleRisk, Eramba,
OneTrust or Archer. Objects the platform owns outright: the standards repository, ISMS scope and
SoA, policies with versions and approvals, tasks and reminders, evidence files with integrity
hashes, reports, and the AI audit log.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class TZDateTime(TypeDecorator):
    """Timezone-aware datetimes on every backend (SQLite returns naive values; normalise to UTC)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    updated_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now, onupdate=_now)


class OrgMixin:
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True)


# ----------------------------------------------------------------------------- tenancy & identity
class Organization(Base, TimestampMixin):
    """Tenant. kind = 'operator' (Tobe/Selenium group entity) or 'client' (CISO-as-a-Service customer)."""

    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    kind: Mapped[str] = mapped_column(String(16), default="client")  # operator | subsidiary | client
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="PT")
    sector: Mapped[str] = mapped_column(String(64), default="software")  # software | banking | insurance | cloud | public
    size_band: Mapped[str] = mapped_column(String(16), default="small")  # micro | small | medium | large
    services_provided: Mapped[list] = mapped_column(JSON, default=list)  # e.g. ["cloud_infrastructure","ciso_as_a_service"]
    regulated_entity: Mapped[bool] = mapped_column(Boolean, default=False)  # DORA financial entity / NIS2 essential|important
    nis2_category: Mapped[str | None] = mapped_column(String(16), nullable=True)  # essential | important | none
    settings: Mapped[dict] = mapped_column(JSON, default=dict)


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="analyst")  # ciso | analyst | auditor | owner
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    mfa_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    org_ids: Mapped[list] = mapped_column(JSON, default=list)  # organizations the user may act on; [] = all (operator CISO)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)


class ConnectorConfig(Base, TimestampMixin):
    """Per-organization connector instance. Credentials are stored encrypted (Fernet) in `secret_blob`."""

    __tablename__ = "connector_configs"
    __table_args__ = (UniqueConstraint("org_id", "key", name="uq_connector_org_key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True)
    key: Mapped[str] = mapped_column(String(64), index=True)  # e.g. "wazuh"
    category: Mapped[str] = mapped_column(String(32))  # grc | security | itsm | identity
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)  # non-secret options (urls, ids)
    secret_blob: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet-encrypted JSON of secrets
    last_sync_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    last_status: Mapped[str] = mapped_column(String(32), default="never")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


# ----------------------------------------------------------------------------- standards repository
class Framework(Base, TimestampMixin):
    """A standard, framework, regulation or law. Versioned; `supersedes` links editions."""

    __tablename__ = "frameworks"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. "iso27001-2022", "dora", "dl125-2025"
    name: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(16), default="standard")  # standard | regulation | law | guideline | framework
    jurisdiction: Mapped[str] = mapped_column(String(16))  # EU | PT | AO | INTL | US
    issuer: Mapped[str] = mapped_column(String(128), default="")
    version: Mapped[str] = mapped_column(String(32), default="")
    effective_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    source_url: Mapped[str] = mapped_column(String(512), default="")
    source_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)  # for regulatory-watch change detection
    last_checked_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    supersedes: Mapped[str | None] = mapped_column(String(64), nullable=True)
    licensed_text: Mapped[bool] = mapped_column(Boolean, default=False)  # ISO texts: store refs/titles only
    content_pack_version: Mapped[str] = mapped_column(String(16), default="0")
    requirements: Mapped[list[Requirement]] = relationship(back_populates="framework", cascade="all, delete-orphan")


class Requirement(Base):
    """A clause, article or control of a framework (the unit of gap analysis and mapping)."""

    __tablename__ = "requirements"
    __table_args__ = (UniqueConstraint("framework_id", "ref", name="uq_req_framework_ref"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    framework_id: Mapped[str] = mapped_column(ForeignKey("frameworks.id"), index=True)
    ref: Mapped[str] = mapped_column(String(64))  # "A.5.19", "Art. 28(3)", "art. 19.º"
    title: Mapped[str] = mapped_column(String(512))
    text: Mapped[str] = mapped_column(Text, default="")  # summary / paraphrase for licensed texts
    domain: Mapped[str] = mapped_column(String(128), default="")
    kind: Mapped[str] = mapped_column(String(16), default="control")  # control | clause | article | obligation
    tags: Mapped[list] = mapped_column(JSON, default=list)
    crosswalk: Mapped[list] = mapped_column(JSON, default=list)  # [{"framework_id":"nist-csf-2","ref":"PR.AA-01"}]
    framework: Mapped[Framework] = relationship(back_populates="requirements")


class KnowledgeDocument(Base, TimestampMixin):
    """Repository entry: a law text, guideline, RTS, template or internal note; searchable by the skill agents."""

    __tablename__ = "knowledge_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=True)  # null = global
    framework_id: Mapped[str | None] = mapped_column(ForeignKey("frameworks.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(512))
    doc_type: Mapped[str] = mapped_column(String(32), default="reference")  # reference | template | guideline | internal
    language: Mapped[str] = mapped_column(String(8), default="pt-PT")
    text: Mapped[str] = mapped_column(Text, default="")
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_url: Mapped[str] = mapped_column(String(512), default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)


# ----------------------------------------------------------------------------- ISMS per organization
class ISMSScope(Base, TimestampMixin, OrgMixin):
    __tablename__ = "isms_scopes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    statement: Mapped[str] = mapped_column(Text, default="")  # ISO 27001 cl. 4.3 scope statement
    boundaries: Mapped[dict] = mapped_column(JSON, default=dict)  # sites, systems, processes, exclusions
    applicable_frameworks: Mapped[list] = mapped_column(JSON, default=list)  # framework ids
    interested_parties: Mapped[list] = mapped_column(JSON, default=list)
    risk_appetite: Mapped[dict] = mapped_column(JSON, default=lambda: {"accept_below": 6, "escalate_at": 15, "matrix": 5})
    status: Mapped[str] = mapped_column(String(32), default="draft")  # draft | approved
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)


class Asset(Base, TimestampMixin, OrgMixin):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), index=True)
    asset_type: Mapped[str] = mapped_column(String(32), default="system")  # system | data | service | people | site | supplier | ai_model
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    classification: Mapped[str] = mapped_column(String(32), default="internal")  # public | internal | confidential | restricted
    cia: Mapped[dict] = mapped_column(JSON, default=lambda: {"c": 2, "i": 2, "a": 2})  # 1-3 each
    criticality: Mapped[str] = mapped_column(String(16), default="medium")
    supports_critical_function: Mapped[bool] = mapped_column(Boolean, default=False)  # DORA / "jóias da coroa"
    location: Mapped[str] = mapped_column(String(128), default="")
    external_system: Mapped[str | None] = mapped_column(String(32), nullable=True)  # wazuh agent, azure resource, intune device
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)


class Control(Base, TimestampMixin, OrgMixin):
    """Applicability and implementation status of a requirement for one organization (the SoA line)."""

    __tablename__ = "controls"
    __table_args__ = (UniqueConstraint("org_id", "requirement_id", name="uq_control_org_req"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    requirement_id: Mapped[str] = mapped_column(ForeignKey("requirements.id"), index=True)
    applicable: Mapped[bool] = mapped_column(Boolean, default=True)
    justification: Mapped[str] = mapped_column(Text, default="")  # SoA inclusion/exclusion reason
    status: Mapped[str] = mapped_column(String(32), default="not_implemented")
    # not_implemented | partially_implemented | implemented | not_applicable
    maturity: Mapped[int] = mapped_column(Integer, default=0)  # 0-5 (CMMI-style)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    implementation_notes: Mapped[str] = mapped_column(Text, default="")
    external_system: Mapped[str | None] = mapped_column(String(32), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    requirement: Mapped[Requirement] = relationship()
    evidence: Mapped[list[Evidence]] = relationship(back_populates="control")


class GapAssessment(Base, TimestampMixin, OrgMixin):
    __tablename__ = "gap_assessments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    framework_id: Mapped[str] = mapped_column(ForeignKey("frameworks.id"))
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="open")
    coverage_pct: Mapped[float] = mapped_column(Float, default=0.0)
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    items: Mapped[list[GapItem]] = relationship(back_populates="assessment", cascade="all, delete-orphan")


class GapItem(Base):
    __tablename__ = "gap_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    assessment_id: Mapped[str] = mapped_column(ForeignKey("gap_assessments.id"), index=True)
    requirement_id: Mapped[str] = mapped_column(ForeignKey("requirements.id"))
    current_status: Mapped[str] = mapped_column(String(32))
    gap_severity: Mapped[str] = mapped_column(String(16), default="medium")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    assessment: Mapped[GapAssessment] = relationship(back_populates="items")


class Policy(Base, TimestampMixin, OrgMixin):
    """Policy, procedure or process document with version history and approval workflow."""

    __tablename__ = "policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(32))  # POL-01, PRC-04, PROC-12
    title: Mapped[str] = mapped_column(String(255))
    doc_kind: Mapped[str] = mapped_column(String(16), default="policy")  # policy | procedure | process | standard | plan
    language: Mapped[str] = mapped_column(String(8), default="pt-PT")
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | in_review | approved | retired
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    review_cycle_months: Mapped[int] = mapped_column(Integer, default=12)
    next_review_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    requirement_refs: Mapped[list] = mapped_column(JSON, default=list)  # [{"framework_id":..,"ref":..}]
    versions: Mapped[list[PolicyVersion]] = relationship(back_populates="policy", cascade="all, delete-orphan")


class PolicyVersion(Base):
    __tablename__ = "policy_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    content_md: Mapped[str] = mapped_column(Text)
    change_note: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(255), default="")
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    sha256: Mapped[str] = mapped_column(String(64))
    policy: Mapped[Policy] = relationship(back_populates="versions")


class PolicyAttestation(Base):
    __tablename__ = "policy_attestations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    user_email: Mapped[str] = mapped_column(String(255))
    attested_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)


# ----------------------------------------------------------------------------- risk, vendors, incidents
class Risk(Base, TimestampMixin, OrgMixin):
    __tablename__ = "risks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    external_system: Mapped[str | None] = mapped_column(String(32), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64), default="ict")
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    threat: Mapped[str] = mapped_column(String(255), default="")
    vulnerability: Mapped[str] = mapped_column(String(255), default="")
    likelihood: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    impact: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    inherent_score: Mapped[int] = mapped_column(Integer, default=9)
    residual_likelihood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    residual_impact: Mapped[int | None] = mapped_column(Integer, nullable=True)
    residual_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level: Mapped[str] = mapped_column(String(16), default="medium")  # computed from appetite thresholds
    treatment: Mapped[str] = mapped_column(String(32), default="open")  # open|mitigate|accept|transfer|avoid|closed
    treatment_plan: Mapped[str] = mapped_column(Text, default="")
    control_ids: Mapped[list] = mapped_column(JSON, default=list)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vendor_id: Mapped[str | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    source_alert_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    accepted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    accepted_until: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    review_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)


class Vendor(Base, TimestampMixin, OrgMixin):
    """ICT third-party provider, modelled on the DORA Register of Information (ITS 2024/2956) fields."""

    __tablename__ = "vendors"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    external_system: Mapped[str | None] = mapped_column(String(32), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    lei: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="PT")
    tier: Mapped[int] = mapped_column(Integer, default=3)  # 1 critical ... 4 low
    supports_critical_function: Mapped[bool] = mapped_column(Boolean, default=False)
    service_type: Mapped[str] = mapped_column(String(128), default="")
    sub_outsourcing: Mapped[bool] = mapped_column(Boolean, default=False)
    subcontractors: Mapped[list] = mapped_column(JSON, default=list)
    data_location: Mapped[str] = mapped_column(String(64), default="EU")
    personal_data: Mapped[bool] = mapped_column(Boolean, default=False)
    contract_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    contract_start: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    contract_end: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    notice_period_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    art30_provisions: Mapped[dict] = mapped_column(JSON, default=dict)
    exit_strategy: Mapped[bool] = mapped_column(Boolean, default=False)
    substitutable: Mapped[str] = mapped_column(String(16), default="unknown")
    inherent_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    residual_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_assessment_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    next_assessment_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    external_rating: Mapped[dict] = mapped_column(JSON, default=dict)


class Incident(Base, TimestampMixin, OrgMixin):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    external_system: Mapped[str | None] = mapped_column(String(32), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text, default="")
    detected_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    status: Mapped[str] = mapped_column(String(32), default="open")  # open|contained|resolved|closed
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    source: Mapped[str] = mapped_column(String(64), default="manual")  # wazuh | defender | manual
    source_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    vendor_id: Mapped[str | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    dora_major: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    dora_criteria: Mapped[dict] = mapped_column(JSON, default=dict)
    nis2_significant: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    personal_data_breach: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    notification_deadlines: Mapped[list] = mapped_column(JSON, default=list)
    root_cause: Mapped[str] = mapped_column(Text, default="")
    ticket_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)


class Vulnerability(Base, TimestampMixin, OrgMixin):
    """Vulnerability finding from Wazuh/Defender/Qualys etc. for the org's or a client's infrastructure."""

    __tablename__ = "vulnerabilities"
    __table_args__ = (UniqueConstraint("org_id", "source", "source_ref", name="uq_vuln_org_src"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String(64))
    source_ref: Mapped[str] = mapped_column(String(255))
    cve: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    cvss: Mapped[float | None] = mapped_column(Float, nullable=True)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    asset_name: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | mitigated | accepted | false_positive
    detected_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    due_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    risk_id: Mapped[str | None] = mapped_column(ForeignKey("risks.id"), nullable=True)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)


# ----------------------------------------------------------------------------- evidence & files
class Evidence(Base, TimestampMixin, OrgMixin):
    """An evidence artefact: connector payload or uploaded file (pdf, xlsx, docx, log, image). Hash for integrity."""

    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    control_id: Mapped[str | None] = mapped_column(ForeignKey("controls.id"), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(64))  # connector key or "upload"
    source_ref: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(512))
    collected_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    result: Mapped[str] = mapped_column(String(16), default="info")  # pass | fail | info
    valid_until: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    ai_mapping_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    control: Mapped[Control | None] = relationship(back_populates="evidence")


# ----------------------------------------------------------------------------- work management
class Task(Base, TimestampMixin, OrgMixin):
    """Agile work item: Kanban status, optional sprint, due date, reminders; linked to the object it serves."""

    __tablename__ = "tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="backlog")  # backlog|todo|doing|review|done
    priority: Mapped[str] = mapped_column(String(16), default="medium")
    assignee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    story_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    recurrence: Mapped[str | None] = mapped_column(String(32), nullable=True)  # monthly | quarterly | annual
    related_kind: Mapped[str | None] = mapped_column(String(32), nullable=True)  # control|risk|vendor|incident|policy|gap
    related_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    ticket_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reminder_days_before: Mapped[list] = mapped_column(JSON, default=lambda: [7, 1])
    last_reminded_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(16), default="inapp")  # inapp | teams | email | jira
    kind: Mapped[str] = mapped_column(String(32), default="reminder")
    title: Mapped[str] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text, default="")
    related_kind: Mapped[str | None] = mapped_column(String(32), nullable=True)
    related_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    read_at: Mapped[datetime | None] = mapped_column(TZDateTime(), nullable=True)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)


class Report(Base, OrgMixin):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(32))  # ciso_brief | soa | risk_register | gap | roi | incident | kpi
    fmt: Mapped[str] = mapped_column(String(8))  # md | json | csv | xlsx | docx | pdf
    title: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    generated_at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now)
    generated_by: Mapped[str] = mapped_column(String(255), default="system")
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)


# ----------------------------------------------------------------------------- AI governance
class AIAuditLog(Base):
    """Every model call: provider, model, purpose, prompt and output hashes, tokens, human decision."""

    __tablename__ = "ai_audit_log"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now, index=True)
    org_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(255), default="system")
    agent: Mapped[str] = mapped_column(String(64))
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(64))
    purpose: Mapped[str] = mapped_column(String(128))
    prompt_sha256: Mapped[str] = mapped_column(String(64))
    output_sha256: Mapped[str] = mapped_column(String(64))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    pii_redacted: Mapped[bool] = mapped_column(Boolean, default=False)
    human_decision: Mapped[str | None] = mapped_column(String(32), nullable=True)  # approved|rejected|edited
    related_object: Mapped[str | None] = mapped_column(String(128), nullable=True)


class SecurityAuditLog(Base):
    """Platform security events: logins, failed logins, permission denials, config and secret changes."""

    __tablename__ = "security_audit_log"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    at: Mapped[datetime] = mapped_column(TZDateTime(), default=_now, index=True)
    actor: Mapped[str] = mapped_column(String(255), default="anonymous")
    org_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    event: Mapped[str] = mapped_column(String(64), index=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
