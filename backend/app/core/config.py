"""Application settings.

All secrets are read from environment variables (or a .env file in development).
Nothing here is ever logged; see core/logging.py for redaction.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- platform ---
    app_name: str = "CISO Nexus"
    environment: Literal["dev", "staging", "prod"] = "dev"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://nexus:nexus@localhost:5432/nexus"
    secret_key: SecretStr = SecretStr("change-me-in-production")
    access_token_minutes: int = 480
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    data_residency_region: str = "EU"  # informational; surfaced in reports and AI system prompts
    jurisdictions: list[str] = ["PT", "EU", "AO"]  # Portugal, European Union, Angola

    # --- AI providers ---
    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-sonnet-4-5"
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-2.5-pro"
    ai_default_provider: Literal["anthropic", "gemini", "auto"] = "auto"
    ai_max_output_tokens: int = 4096
    ai_pii_redaction: bool = True  # redact obvious PII before any outbound model call

    # --- GRC systems of record ---
    ciso_assistant_url: str | None = None
    ciso_assistant_token: SecretStr | None = None
    simplerisk_url: str | None = None
    simplerisk_api_key: SecretStr | None = None
    eramba_url: str | None = None
    eramba_api_key: SecretStr | None = None
    onetrust_url: str | None = None
    onetrust_api_key: SecretStr | None = None
    archer_url: str | None = None
    archer_instance: str | None = None
    archer_username: str | None = None
    archer_password: SecretStr | None = None

    # --- security tooling ---
    wazuh_url: str | None = None  # https://wazuh-manager:55000
    wazuh_user: str | None = None
    wazuh_password: SecretStr | None = None
    wazuh_indexer_url: str | None = None  # https://wazuh-indexer:9200 (alerts via OpenSearch API)
    wazuh_indexer_user: str | None = None
    wazuh_indexer_password: SecretStr | None = None
    wazuh_verify_tls: bool = True

    azure_tenant_id: str | None = None
    azure_client_id: str | None = None
    azure_client_secret: SecretStr | None = None
    azure_subscription_ids: list[str] = Field(default_factory=list)

    # --- ITSM / collaboration ---
    jira_url: str | None = None
    jira_email: str | None = None
    jira_api_token: SecretStr | None = None
    jira_project_key: str = "SEC"
    servicenow_url: str | None = None
    servicenow_user: str | None = None
    servicenow_password: SecretStr | None = None
    teams_webhook_url: SecretStr | None = None

    # --- scheduler ---
    scheduler_enabled: bool = True
    evidence_sync_cron: str = "0 */6 * * *"  # every 6 hours
    alert_triage_cron: str = "*/15 * * * *"  # every 15 minutes


@lru_cache
def get_settings() -> Settings:
    return Settings()
