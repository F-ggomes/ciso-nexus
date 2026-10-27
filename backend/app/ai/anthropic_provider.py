from __future__ import annotations

from app.ai.base import Completion, LLMProvider
from app.core.config import get_settings


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = None
        if self._settings.anthropic_api_key:
            from anthropic import AsyncAnthropic

            self._client = AsyncAnthropic(api_key=self._settings.anthropic_api_key.get_secret_value())

    def available(self) -> bool:
        return self._client is not None

    async def complete(self, system, messages, tools=None, max_tokens=4096, temperature=0.2, json_mode=False):
        assert self._client, "Anthropic API key not configured"
        api_messages: list[dict] = []
        for m in messages:
            if m.role == "tool":
                block = {"type": "tool_result", "tool_use_id": m.tool_call_id, "content": m.content}
                if api_messages and api_messages[-1]["role"] == "user" and isinstance(api_messages[-1]["content"], list):
                    api_messages[-1]["content"].append(block)  # merge consecutive tool results into one user turn
                else:
                    api_messages.append({"role": "user", "content": [block]})
            elif m.role == "assistant" and m.tool_calls:
                blocks = ([{"type": "text", "text": m.content}] if m.content else []) + [
                    {"type": "tool_use", "id": c["id"], "name": c["name"], "input": c.get("input") or {}} for c in m.tool_calls]
                api_messages.append({"role": "assistant", "content": blocks})
            else:
                api_messages.append({"role": m.role, "content": m.content})
        kwargs = {
            "model": self._settings.anthropic_model,
            "system": system + ("\nRespond with a single valid JSON object only." if json_mode else ""),
            "messages": api_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = [
                {"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools
            ]
        resp = await self._client.messages.create(**kwargs)
        text_parts, tool_calls = [], []
        for block in resp.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({"id": block.id, "name": block.name, "input": block.input})
        return Completion(
            text="".join(text_parts),
            provider="anthropic",
            model=resp.model,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
            tool_calls=tool_calls,
            raw=resp,
        )
