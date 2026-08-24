"""
Chat route — handles LLM conversation with context injection.
"""
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from context import get_full_context
from llm.router import get_llm_adapter
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


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get an LLM response with hamster context."""
    try:
        adapter = get_llm_adapter()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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

    try:
        response_text = await adapter.generate(
            messages=messages,
            system_prompt=system_prompt,
        )

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
async def get_greeting():
    """Generate a cute 2-6 word AI greeting or thought from Hammy."""
    import random
    
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

    try:
        adapter = get_llm_adapter()
        prompt = (
            "You are Hammy, a cheerful, cute desktop hamster pet. "
            "Generate a single adorable, encouraging thought or greeting for the user. "
            "It MUST be strictly between 2 to 6 words long. "
            "Include 1 cute emoji. Output ONLY the 2-6 words."
        )
        text = await adapter.generate(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="You are a tiny, cheerful pet hamster. Respond in strictly 2 to 6 words only.",
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

