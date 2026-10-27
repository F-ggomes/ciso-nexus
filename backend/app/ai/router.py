"""Model routing and audited execution.

Routing policy (overridable per call):
  * reasoning-heavy, regulatory interpretation, drafting  -> Anthropic (Claude)
  * very long context (large logs, big questionnaires)    -> Gemini
  * "auto": prefer Claude when available, fall back to Gemini, and vice versa
Every call writes an AIAuditLog row with hashes, tokens, latency and redaction flag.
"""
from __future__ import annotations

import hashlib
import time
from typing import TYPE_CHECKING

from app.ai.anthropic_provider import AnthropicProvider
from app.ai.base import Completion, LLMProvider, Message, ProviderName, ToolSpec
from app.ai.gemini_provider import GeminiProvider
from app.ai.redaction import redact
from app.core.config import get_settings
from app.core.logging import get_logger

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

log = get_logger(__name__)

_LONG_CONTEXT_CHARS = 120_000


class ModelRouter:
    def __init__(self) -> None:
        self.providers: dict[ProviderName, LLMProvider] = {
            "anthropic": AnthropicProvider(),
            "gemini": GeminiProvider(),
        }

    def available(self) -> list[ProviderName]:
        return [name for name, p in self.providers.items() if p.available()]

    def pick(self, preferred: ProviderName | None, prompt_chars: int, task: str) -> LLMProvider:
        s = get_settings()
        order: list[ProviderName]
        if preferred:
            order = [preferred, "gemini" if preferred == "anthropic" else "anthropic"]
        elif s.ai_default_provider != "auto":
            order = [s.ai_default_provider, "gemini" if s.ai_default_provider == "anthropic" else "anthropic"]
        elif prompt_chars > _LONG_CONTEXT_CHARS or task in {"log_summarisation", "questionnaire_bulk"}:
            order = ["gemini", "anthropic"]
        else:
            order = ["anthropic", "gemini"]
        for name in order:
            if self.providers[name].available():
                return self.providers[name]
        raise RuntimeError("No AI provider configured. Set ANTHROPIC_API_KEY and/or GEMINI_API_KEY.")

    async def run(
        self,
        db: Session | None,
        *,
        agent: str,
        purpose: str,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        preferred: ProviderName | None = None,
        json_mode: bool = False,
        actor: str = "system",
        related_object: str | None = None,
        temperature: float = 0.2,
        org_id: str | None = None,
    ) -> Completion:
        s = get_settings()
        redacted_any = False
        if s.ai_pii_redaction:
            cleaned: list[Message] = []
            for m in messages:
                text, changed = redact(m.content)
                redacted_any |= changed
                cleaned.append(Message(m.role, text, m.tool_name, m.tool_input, m.tool_call_id))
            messages = cleaned
        prompt_blob = system + "\n".join(m.content for m in messages)
        provider = self.pick(preferred, len(prompt_blob), purpose)
        t0 = time.perf_counter()
        completion = await provider.complete(
            system, messages, tools=tools, max_tokens=s.ai_max_output_tokens, temperature=temperature, json_mode=json_mode
        )
        latency = int((time.perf_counter() - t0) * 1000)
        if db is not None:
            from app.db.models import AIAuditLog

            db.add(
                AIAuditLog(
                    org_id=org_id,
                    actor=actor,
                    agent=agent,
                    provider=completion.provider,
                    model=completion.model,
                    purpose=purpose,
                    prompt_sha256=hashlib.sha256(prompt_blob.encode()).hexdigest(),
                    output_sha256=hashlib.sha256(completion.text.encode()).hexdigest(),
                    input_tokens=completion.input_tokens,
                    output_tokens=completion.output_tokens,
                    latency_ms=latency,
                    pii_redacted=redacted_any,
                    related_object=related_object,
                )
            )
            db.commit()
        log.info("ai.call", agent=agent, provider=completion.provider, latency_ms=latency, tokens_in=completion.input_tokens)
        return completion


from app.ai.util import parse_json  # noqa: F401  (re-export)

router = ModelRouter()
