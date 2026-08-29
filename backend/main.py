"""
HamsterDesk — FastAPI Backend
Main application entry point.
"""

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
try:
    from urllib3.exceptions import NotOpenSSLWarning
    warnings.filterwarnings("ignore", category=NotOpenSSLWarning)
except ImportError:
    pass

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config_manager import load_config
from routes.chat import router as chat_router
from routes.todos import router as todos_router
from routes.config import router as config_router
from routes.voice import router as voice_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — load config on startup."""
    print("🐹 HamsterDesk backend starting up...")
    load_config()
    print("✅ Configuration loaded")
    yield
    print("🐹 HamsterDesk backend shutting down...")


app = FastAPI(
    title="HamsterDesk API",
    description="Backend API for HamsterDesk — AI Desktop Pet & Productivity Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────
default_origins = [
    "http://localhost:3000",      # Next.js dev server
    "http://localhost:3001",      # Alternate port
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "app://.",                     # Electron
    "file://",                     # Electron local files
]
env_cors = os.getenv("CORS_ORIGINS", "")
if env_cors:
    if env_cors.strip() == "*":
        allowed_origins = ["*"]
    else:
        allowed_origins = [o.strip() for o in env_cors.split(",") if o.strip()] + default_origins
else:
    allowed_origins = ["*"]  # Public-friendly default for web API

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True if allowed_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────
app.include_router(chat_router)
app.include_router(todos_router)
app.include_router(config_router)
app.include_router(voice_router)


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "pet": "🐹", "message": "Hammy is running!"}


@app.get("/context")
async def get_context():
    """Return the current full context that would be injected into LLM calls."""
    from context import get_full_context
    return {"context": get_full_context()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
