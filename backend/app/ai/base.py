"""Provider-neutral LLM interface.

Both providers expose the same `complete()` contract so agents never import a vendor SDK.
Tool use is expressed as JSON schema; each provider adapts it to its native format.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Literal

ProviderName = Literal["anthropic", "gemini"]


@dataclass
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]


@dataclass
class Message:
    role: Literal["user", "assistant", "tool"]
    content: str
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    tool_call_id: str | None = None
    tool_calls: list[dict[str, Any]] | None = None  # assistant turn that requested tools


@dataclass
class Completion:
    text: str
    provider: ProviderName
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    raw: Any = None


class LLMProvider(ABC):
    name: ProviderName

    @abstractmethod
    async def complete(
        self,
        system: str,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.2,
        json_mode: bool = False,
    ) -> Completion: ...

    @abstractmethod
    def available(self) -> bool: ...
