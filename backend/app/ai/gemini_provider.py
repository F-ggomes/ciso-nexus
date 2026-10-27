from __future__ import annotations

from app.ai.base import Completion, LLMProvider
from app.core.config import get_settings


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = None
        if self._settings.gemini_api_key:
            from google import genai

            self._client = genai.Client(api_key=self._settings.gemini_api_key.get_secret_value())

    def available(self) -> bool:
        return self._client is not None

    async def complete(self, system, messages, tools=None, max_tokens=4096, temperature=0.2, json_mode=False):
        assert self._client, "Gemini API key not configured"
        from google.genai import types

        contents = []
        for m in messages:
            if m.role == "tool":
                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_function_response(
                                name=m.tool_name or "tool", response={"result": m.content}
                            )
                        ],
                    )
                )
            elif m.role == "assistant" and m.tool_calls:
                parts = ([types.Part.from_text(text=m.content)] if m.content else []) + [
                    types.Part.from_function_call(name=c["name"], args=c.get("input") or {}) for c in m.tool_calls]
                contents.append(types.Content(role="model", parts=parts))
            else:
                role = "model" if m.role == "assistant" else "user"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.content)]))

        config_kwargs = {
            "system_instruction": system,
            "max_output_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"
        if tools:
            decls = [
                types.FunctionDeclaration(name=t.name, description=t.description, parameters=t.input_schema)
                for t in tools
            ]
            config_kwargs["tools"] = [types.Tool(function_declarations=decls)]

        resp = await self._client.aio.models.generate_content(
            model=self._settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        tool_calls = []
        text = ""
        cand = resp.candidates[0] if resp.candidates else None
        if cand and cand.content and cand.content.parts:
            for part in cand.content.parts:
                fc = getattr(part, "function_call", None)
                part_text = getattr(part, "text", None)
                if fc and getattr(fc, "name", None):
                    tool_calls.append({"id": fc.name, "name": fc.name, "input": dict(fc.args or {})})
                elif part_text:
                    text += part_text
        usage = resp.usage_metadata
        return Completion(
            text=text,
            provider="gemini",
            model=self._settings.gemini_model,
            input_tokens=getattr(usage, "prompt_token_count", 0) or 0,
            output_tokens=getattr(usage, "candidates_token_count", 0) or 0,
            tool_calls=tool_calls,
            raw=resp,
        )
