"""LLM service for structured extraction and analysis.

Provides a unified interface over OpenAI and Anthropic models with
JSON-mode responses for structured data extraction.
"""

import json
import logging
from typing import Any

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from src.config import settings

logger = logging.getLogger("policyguard.llm")

_openai_client: AsyncOpenAI | None = None
_anthropic_client: AsyncAnthropic | None = None


def _get_openai() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_anthropic() -> AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _anthropic_client


async def call_openai(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = True,
    temperature: float = 0.1,
    max_tokens: int = 4096,
) -> dict | str:
    """Call OpenAI chat completion.

    Args:
        system_prompt: System message content.
        user_prompt: User message content.
        json_mode: If True, request JSON response format.
        temperature: Sampling temperature.
        max_tokens: Maximum response tokens.

    Returns:
        Parsed JSON dict if json_mode, otherwise raw string.
    """
    client = _get_openai()

    kwargs: dict[str, Any] = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content or ""

    if json_mode:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from OpenAI response, returning raw text")
            return content

    return content


async def call_anthropic(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 4096,
) -> dict | str:
    """Call Anthropic Claude completion.

    Returns parsed JSON if the response is valid JSON, otherwise raw string.
    """
    client = _get_anthropic()

    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    content = response.content[0].text if response.content else ""

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return content


async def extract_structured_data(
    text: str,
    extraction_prompt: str,
    schema_description: str,
) -> dict:
    """Extract structured data from text using the configured LLM.

    Uses OpenAI by default (for JSON mode support). Falls back to
    Anthropic if OpenAI key is not configured.

    Args:
        text: The source text to extract from.
        extraction_prompt: Instructions for what to extract.
        schema_description: Description of the expected JSON schema.

    Returns:
        Extracted data as a dict.
    """
    system_prompt = f"""You are an expert insurance policy analyst. Extract structured data from the provided policy text.

{extraction_prompt}

Return your response as a JSON object matching this schema:
{schema_description}

Be precise and include confidence scores (0-1) for each extracted field.
If a field cannot be determined from the text, use null and set its confidence to 0."""

    user_prompt = f"Policy text to analyze:\n\n{text}"

    if settings.OPENAI_API_KEY:
        result = await call_openai(system_prompt, user_prompt, json_mode=True)
    elif settings.ANTHROPIC_API_KEY:
        result = await call_anthropic(system_prompt, user_prompt)
    else:
        logger.error("No LLM API key configured")
        return {"error": "No LLM API key configured"}

    if isinstance(result, dict):
        return result
    return {"raw_response": result}
