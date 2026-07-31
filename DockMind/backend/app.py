"""
DockAssist application entry point.

Initialises the FastAPI app, registers CORS middleware, and mounts all API routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth, docker, ai, history, prompts
from config.config import settings

app = FastAPI(
    title="DockMind API",
    description="AI-Powered Docker Health Dashboard Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(docker.router, prefix="/api/v1/docker", tags=["Docker"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(history.router, prefix="/api/v1/history", tags=["History"])
app.include_router(prompts.router, prefix="/api/v1/prompts", tags=["Prompts"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": "DockMind"}
