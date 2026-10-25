from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    org_ids: list[str] = []


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=12)
    role: Literal["ciso", "analyst", "auditor", "owner"] = "analyst"
    org_ids: list[str] = []


class OrgCreate(BaseModel):
    name: str
    kind: Literal["operator", "subsidiary", "client"] = "client"
    parent_id: str | None = None
    country: str = "PT"
    sector: str = "software"
    size_band: Literal["micro", "small", "medium", "large"] = "small"
    services_provided: list[str] = []
    regulated_entity: bool = False
    nis2_category: Literal["essential", "important", "none"] | None = None
    settings: dict[str, Any] = {}


class ConnectorConfigIn(BaseModel):
    settings: dict[str, Any] = {}
    secrets: dict[str, str] = {}
    enabled: bool = True


class ISMSBootstrapIn(BaseModel):
    framework_ids: list[str]
    scope_statement: str
    language: str = "pt-PT"


class ScopeUpdate(BaseModel):
    statement: str | None = None
    boundaries: dict[str, Any] | None = None
    interested_parties: list[Any] | None = None
    risk_appetite: dict[str, int] | None = None


class AssetIn(BaseModel):
    name: str
    asset_type: str = "system"
    owner: str | None = None
    classification: str = "internal"
    cia: dict[str, int] = {"c": 2, "i": 2, "a": 2}
    criticality: str = "medium"
    supports_critical_function: bool = False
    location: str = ""
    attributes: dict[str, Any] = {}


class AssetUpdate(BaseModel):
    name: str | None = None
    asset_type: str | None = None
    owner: str | None = None
    classification: str | None = None
    cia: dict[str, int] | None = None
    criticality: str | None = None
    supports_critical_function: bool | None = None
    location: str | None = None
    attributes: dict[str, Any] | None = None


class ControlUpdate(BaseModel):
    applicable: bool | None = None
    justification: str | None = None
    status: Literal["not_implemented", "partially_implemented", "implemented", "not_applicable"] | None = None
    maturity: int | None = Field(default=None, ge=0, le=5)
    owner: str | None = None
    implementation_notes: str | None = None


class PolicyIn(BaseModel):
    code: str
    title: str
    doc_kind: Literal["policy", "procedure", "process", "standard", "plan"] = "policy"
    language: str = "pt-PT"
    owner: str | None = None
    review_cycle_months: int = 12
    requirement_refs: list[dict[str, str]] = []


class PolicyDraftIn(BaseModel):
    instructions: str = ""
    provider: Literal["anthropic", "gemini"] | None = None


class PolicyVersionIn(BaseModel):
    content_md: str
    change_note: str = ""


class RiskIn(BaseModel):
    title: str
    description: str = ""
    category: str = "ict"
    asset_id: str | None = None
    threat: str = ""
    vulnerability: str = ""
    likelihood: int = Field(default=3, ge=1, le=5)
    impact: int = Field(default=3, ge=1, le=5)
    residual_likelihood: int | None = Field(default=None, ge=1, le=5)
    residual_impact: int | None = Field(default=None, ge=1, le=5)
    treatment: str = "open"
    treatment_plan: str = ""
    owner: str | None = None
    vendor_id: str | None = None
    control_ids: list[str] = []
    source_alert_ref: str | None = None
    actions: list[dict[str, Any]] | None = None  # from AI draft; converted into tasks


class RiskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    asset_id: str | None = None
    threat: str | None = None
    vulnerability: str | None = None
    likelihood: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    residual_likelihood: int | None = Field(default=None, ge=1, le=5)
    residual_impact: int | None = Field(default=None, ge=1, le=5)
    treatment: str | None = None
    treatment_plan: str | None = None
    owner: str | None = None
    vendor_id: str | None = None
    control_ids: list[str] | None = None


class RiskAcceptIn(BaseModel):
    justification: str
    accepted_until: datetime | None = None


class FindingIn(BaseModel):
    finding: dict[str, Any]
    provider: Literal["anthropic", "gemini"] | None = None


class VendorIn(BaseModel):
    name: str
    lei: str | None = None
    country: str = "PT"
    tier: int = Field(default=3, ge=1, le=4)
    supports_critical_function: bool = False
    service_type: str = ""
    sub_outsourcing: bool = False
    subcontractors: list[Any] = []
    data_location: str = "EU"
    personal_data: bool = False
    contract_ref: str | None = None
    contract_start: datetime | None = None
    contract_end: datetime | None = None
    notice_period_days: int | None = None
    exit_strategy: bool = False
    substitutable: str = "unknown"


class VendorUpdate(BaseModel):
    name: str | None = None
    lei: str | None = None
    country: str | None = None
    tier: int | None = Field(default=None, ge=1, le=4)
    supports_critical_function: bool | None = None
    service_type: str | None = None
    sub_outsourcing: bool | None = None
    subcontractors: list[Any] | None = None
    data_location: str | None = None
    personal_data: bool | None = None
    contract_ref: str | None = None
    contract_start: datetime | None = None
    contract_end: datetime | None = None
    notice_period_days: int | None = None
    exit_strategy: bool | None = None
    substitutable: str | None = None
    next_assessment_at: datetime | None = None


class VendorAssessIn(BaseModel):
    assessment_content: str = ""
    provider: Literal["anthropic", "gemini"] | None = None
    apply: bool = False  # write tier/scores back to the vendor record after human review


class IncidentIn(BaseModel):
    title: str
    description: str = ""
    detected_at: datetime | None = None
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    source: str = "manual"
    asset_id: str | None = None
    vendor_id: str | None = None


class IncidentUpdate(BaseModel):
    status: Literal["open", "contained", "resolved", "closed"] | None = None
    root_cause: str | None = None
    severity: Literal["low", "medium", "high", "critical"] | None = None


class TaskIn(BaseModel):
    title: str
    description: str = ""
    status: Literal["backlog", "todo", "doing", "review", "done"] = "backlog"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    assignee: str | None = None
    sprint: str | None = None
    story_points: int | None = None
    due_at: datetime | None = None
    recurrence: Literal["monthly", "quarterly", "annual"] | None = None
    related_kind: str | None = None
    related_id: str | None = None
    reminder_days_before: list[int] = [7, 1]


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["backlog", "todo", "doing", "review", "done"] | None = None
    priority: Literal["low", "medium", "high", "critical"] | None = None
    assignee: str | None = None
    sprint: str | None = None
    story_points: int | None = None
    due_at: datetime | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatIn(BaseModel):
    messages: list[ChatMessage]
    provider: Literal["anthropic", "gemini"] | None = None


class SkillAskIn(BaseModel):
    skill: Literal["standards", "regulation", "risk_controls", "grc_ai", "integrations"]
    question: str
    framework_ids: list[str] | None = None
    provider: Literal["anthropic", "gemini"] | None = None
    history: list[ChatMessage] = []


class ConfigProposeIn(BaseModel):
    description: str
    provider: Literal["anthropic", "gemini"] | None = None


class KnowledgeDocIn(BaseModel):
    title: str
    doc_type: Literal["reference", "template", "guideline", "internal"] = "reference"
    language: str = "pt-PT"
    text: str
    framework_id: str | None = None
    source_url: str = ""
    tags: list[str] = []
