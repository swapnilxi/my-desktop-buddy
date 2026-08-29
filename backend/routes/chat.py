"""
Chat route — handles LLM conversation with context injection and dynamic client credentials.
"""
from typing import List, Optional
import re
import random

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from context import get_full_context
from llm.router import generate_with_fallback
from config_manager import get_config

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    use_rag: bool = False


class ChatResponse(BaseModel):
    response: str
    model: str
    hamster_mood: str  # idle, thinking, speaking, happy


def _extract_client_context(
    x_gemini_key: Optional[str] = None,
    x_deepseek_key: Optional[str] = None,
    x_llm_provider: Optional[str] = None,
    x_gemini_model: Optional[str] = None,
    x_deepseek_model: Optional[str] = None,
):
    client_keys = {}
    if x_gemini_key:
        client_keys["gemini_key"] = x_gemini_key.strip()
    if x_deepseek_key:
        client_keys["deepseek_key"] = x_deepseek_key.strip()

    client_models = {}
    if x_gemini_model:
        client_models["gemini_model"] = x_gemini_model.strip()
    if x_deepseek_model:
        client_models["deepseek_model"] = x_deepseek_model.strip()

    return client_keys, client_models, x_llm_provider


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_gemini_key: Optional[str] = Header(None),
    x_deepseek_key: Optional[str] = Header(None),
    x_llm_provider: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_deepseek_model: Optional[str] = Header(None),
):
    """Send a message and get an LLM response with hamster context and client-side keys."""
    # Build system prompt from context
    system_prompt = get_full_context()

    # Add RAG context if enabled
    if request.use_rag:
        config = get_config()
        if config.rag.enabled:
            try:
                from rag.engine import get_relevant_context
                rag_context = await get_relevant_context(request.message)
                if rag_context:
                    system_prompt += f"\n\nRelevant knowledge base context:\n{rag_context}"
            except Exception:
                pass  # RAG failure shouldn't block chat

    # Build message history
    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    client_keys, client_models, client_provider = _extract_client_context(
        x_gemini_key, x_deepseek_key, x_llm_provider, x_gemini_model, x_deepseek_model
    )

    try:
        response_text, adapter = await generate_with_fallback(
            messages=messages,
            system_prompt=system_prompt,
            client_provider=client_provider,
            client_keys=client_keys,
            client_models=client_models,
        )

        # Clean any unwanted internal thinking or action prefixes
        response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
        response_text = re.sub(r'^(Thought|Action|Thinking):\s*', '', response_text, flags=re.IGNORECASE | re.MULTILINE)
        response_text = response_text.strip()

        # Determine hamster mood based on response
        mood = "speaking"
        lower_response = response_text.lower()
        if any(w in lower_response for w in ["great job", "well done", "congrat", "awesome", "🎉"]):
            mood = "happy"

        return ChatResponse(
            response=response_text,
            model=adapter.get_model_name(),
            hamster_mood=mood,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")


class GreetingResponse(BaseModel):
    greeting: str
    model: str


@router.get("/greeting", response_model=GreetingResponse)
async def get_greeting(
    x_gemini_key: Optional[str] = Header(None),
    x_deepseek_key: Optional[str] = Header(None),
    x_llm_provider: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_deepseek_model: Optional[str] = Header(None),
):
    """Generate a cute 2-6 word AI greeting or thought from Hammy."""
    fallback_greetings = [
        "Squeak! Let's code together! 🚀",
        "Crunching sunflower seeds! 🌻",
        "You've got this! ✨",
        "Whiskers twitching with ideas! 🐾",
        "Watching you build! 💻",
        "Need a quick stretch? 🧘",
        "Your code looks awesome! 🐹",
        "Tiny hamster, big dreams! 🌟",
        "Always in your corner! 💛",
        "Ready when you are! ⚡",
    ]

    client_keys, client_models, client_provider = _extract_client_context(
        x_gemini_key, x_deepseek_key, x_llm_provider, x_gemini_model, x_deepseek_model
    )

    try:
        prompt = (
            "You are Hammy, a cheerful, cute desktop hamster pet. "
            "Generate a single adorable, encouraging thought or greeting for the user. "
            "It MUST be strictly between 2 to 6 words long. "
            "Include 1 cute emoji. Output ONLY the 2-6 words."
        )
        text, adapter = await generate_with_fallback(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="You are a tiny, cheerful pet hamster. Respond in strictly 2 to 6 words only.",
            client_provider=client_provider,
            client_keys=client_keys,
            client_models=client_models,
        )
        cleaned = text.strip().strip('"').strip("'")
        # Ensure it's reasonably short
        words = cleaned.split()
        if len(words) > 8:
            cleaned = " ".join(words[:6]) + " 🐹"
        return GreetingResponse(greeting=cleaned, model=adapter.get_model_name())
    except Exception:
        # Graceful fallback to curated greetings if LLM is offline or no API key set
        return GreetingResponse(
            greeting=random.choice(fallback_greetings),
            model="local-preset"
        )


