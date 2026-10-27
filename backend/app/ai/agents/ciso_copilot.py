"""CISO Copilot: a tool-using conversational agent over the platform's own services.

The tool loop runs at most `max_steps` iterations; every tool is read-only except `create_ticket`,
which is only exposed when the caller holds the ciso or analyst role.
"""
from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.orm import Session

from app.ai.agents.prompts import CISO_COPILOT
from app.ai.base import Message, ToolSpec
from app.ai.router import router

ToolFn = Callable[[dict[str, Any]], Awaitable[Any]]


class CISOCopilot:
    agent = "ciso_copilot"

    def __init__(self, tools: dict[str, tuple[ToolSpec, ToolFn]]):
        self.tools = tools

    async def chat(self, db: Session | None, history: list[Message], actor: str, max_steps: int = 6, preferred=None,
               org_id: str | None = None) -> dict:
        specs = [spec for spec, _ in self.tools.values()]
        messages = list(history)
        trace: list[dict] = []
        for _ in range(max_steps):
            completion = await router.run(
                db, agent=self.agent, purpose="copilot_chat", system=CISO_COPILOT,
                messages=messages, tools=specs, actor=actor, preferred=preferred, org_id=org_id,
            )
            if not completion.tool_calls:
                return {"answer": completion.text, "trace": trace, "provider": completion.provider, "model": completion.model}
            # Record the assistant turn with its tool requests, then execute tools
            messages.append(Message("assistant", completion.text, tool_calls=completion.tool_calls))
            for call in completion.tool_calls:
                spec_fn = self.tools.get(call["name"])
                if not spec_fn:
                    result: Any = {"error": f"unknown tool {call['name']}"}
                else:
                    try:
                        result = await spec_fn[1](call.get("input") or {})
                    except Exception as exc:  # noqa: BLE001 - surfaced to the model, logged upstream
                        result = {"error": str(exc)}
                trace.append({"tool": call["name"], "input": call.get("input"), "result_preview": str(result)[:400]})
                messages.append(
                    Message("tool", json.dumps(result, default=str)[:30_000], tool_name=call["name"], tool_call_id=call["id"])
                )
        return {"answer": "I reached the tool-call limit before finishing. Here is what I gathered:\n"
                + json.dumps(trace, indent=2, default=str)[:4000], "trace": trace, "provider": None, "model": None}
