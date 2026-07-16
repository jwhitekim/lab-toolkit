"""
AI Provider abstraction layer.

Shared across all backend subapps (paper_analyzer, translator, reviwer,
todo, contextor). Lets callers switch between Claude and Gemini (or add
more providers later) without touching call-site logic. Provider is
selected via the AI_PROVIDER env var ("claude" | "gemini"), defaulting to
"claude".
"""
import base64
import os
from abc import ABC, abstractmethod
from typing import AsyncIterator

from fastapi import HTTPException


class AIProvider(ABC):
    """Common interface every provider must implement."""

    @abstractmethod
    def complete(
        self,
        system: str,
        user: str,
        max_tokens: int = 512,
        tier: str = "fast",
        images: list[tuple[str, bytes]] | None = None,
    ) -> str:
        """Run a single-turn completion and return the raw text response.

        tier selects the model size ("fast" | "smart"). images, if given,
        is a list of (media_type, raw_bytes) attached alongside user text.
        """
        raise NotImplementedError

    @abstractmethod
    def stream(
        self,
        system: str,
        user: str,
        max_tokens: int = 512,
        tier: str = "smart",
    ) -> AsyncIterator[str]:
        """Run a single-turn completion, yielding text chunks as they arrive."""
        raise NotImplementedError


class ClaudeProvider(AIProvider):
    def __init__(self):
        import anthropic

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
        self._client = anthropic.Anthropic(api_key=api_key)
        self._async_client = anthropic.AsyncAnthropic(api_key=api_key)
        self._models = {
            "fast": os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001"),
            "smart": os.getenv("CLAUDE_MODEL_SMART", "claude-sonnet-4-6"),
        }

    def _model(self, tier: str) -> str:
        model = self._models.get(tier)
        if model is None:
            raise HTTPException(status_code=500, detail=f"Unknown model tier '{tier}'")
        return model

    def _content(self, user: str, images: list[tuple[str, bytes]] | None):
        if not images:
            return user
        blocks = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64.standard_b64encode(data).decode(),
                },
            }
            for media_type, data in images
        ]
        blocks.append({"type": "text", "text": user})
        return blocks

    def complete(self, system, user, max_tokens=512, tier="fast", images=None):
        message = self._client.messages.create(
            model=self._model(tier),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": self._content(user, images)}],
        )
        return message.content[0].text.strip()

    async def stream(self, system, user, max_tokens=512, tier="smart"):
        async with self._async_client.messages.stream(
            model=self._model(tier),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as s:
            async for chunk in s.text_stream:
                yield chunk


class GeminiProvider(AIProvider):
    def __init__(self):
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")
        self._client = genai.Client(api_key=api_key)
        self._models = {
            "fast": os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash"),
            "smart": os.getenv("GEMINI_MODEL_SMART", "gemini-2.5-pro"),
        }

    def _model(self, tier: str) -> str:
        model = self._models.get(tier)
        if model is None:
            raise HTTPException(status_code=500, detail=f"Unknown model tier '{tier}'")
        return model

    def _contents(self, user: str, images: list[tuple[str, bytes]] | None):
        from google.genai import types

        if not images:
            return user
        parts = [
            types.Part.from_bytes(data=data, mime_type=media_type)
            for media_type, data in images
        ]
        parts.append(types.Part.from_text(text=user))
        return parts

    def complete(self, system, user, max_tokens=512, tier="fast", images=None):
        from google.genai import types

        response = self._client.models.generate_content(
            model=self._model(tier),
            contents=self._contents(user, images),
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
            ),
        )
        return (response.text or "").strip()

    async def stream(self, system, user, max_tokens=512, tier="smart"):
        from google.genai import types

        async for chunk in self._client.aio.models.generate_content_stream(
            model=self._model(tier),
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
            ),
        ):
            if chunk.text:
                yield chunk.text


_PROVIDERS = {
    "claude": ClaudeProvider,
    "gemini": GeminiProvider,
}


def get_ai_provider() -> AIProvider:
    """Factory: returns the configured provider instance.

    Reads AI_PROVIDER env var each call (cheap — client construction is
    lightweight), so switching providers only needs an env var change +
    restart, no code edits.
    """
    name = os.getenv("AI_PROVIDER", "claude").lower()
    provider_cls = _PROVIDERS.get(name)
    if provider_cls is None:
        raise HTTPException(
            status_code=500,
            detail=f"Unknown AI_PROVIDER '{name}'. Valid options: {list(_PROVIDERS)}",
        )
    return provider_cls()
