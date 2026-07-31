"""
DockAssist API — application entry point.

This module creates and configures the FastAPI application instance.
It is the only file that should wire together routers, middleware,
exception handlers, and lifecycle hooks. Business logic lives exclusively
in the ``services`` and ``api`` layers.

Start the server::

    uvicorn app:app --reload
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import ai, auth, docker, history, prompts
from config.config import settings
from utils.logger import logger


# ---------------------------------------------------------------------------
# Lifespan — startup and shutdown hooks
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:  # noqa: ARG001
    """
    Manage application startup and shutdown lifecycle.

    Startup runs before the first request is served; shutdown runs after
    the last response has been sent. Database connections, external SDK
    clients, and background workers should be initialised and torn down here
    in future iterations.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info(
        "Starting %s v%s [environment: %s]",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT,
    )

    yield  # application is running and serving requests

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down %s — goodbye.", settings.APP_NAME)


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description=(
        "AI-powered Docker management platform. "
        "Manage containers, query real-time stats, and issue natural language "
        "commands through the Google Gemini AI integration."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Development origins are listed explicitly. In production, replace this list
# with the value of an ALLOWED_ORIGINS environment variable.
# ---------------------------------------------------------------------------
_CORS_ORIGINS: list[str] = [
    "http://localhost:3000",   # React / Next.js default
    "http://localhost:5173",   # Vite default
    "http://localhost:8080",   # Vue CLI default
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Return a consistent JSON body for all HTTPException instances."""
    logger.warning(
        "HTTP %s on %s — %s",
        exc.status_code,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unexpected server errors.

    Stack traces are logged internally but never surfaced to the client,
    preventing information leakage in production environments.
    """
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred."},
    )


# ---------------------------------------------------------------------------
# API routers
# ---------------------------------------------------------------------------

app.include_router(auth.router,    prefix="/api/v1/auth",    tags=["Authentication"])
app.include_router(docker.router,  prefix="/api/v1/docker",  tags=["Docker"])
app.include_router(ai.router,      prefix="/api/v1/ai",      tags=["AI"])
app.include_router(history.router, prefix="/api/v1/history", tags=["History"])
app.include_router(prompts.router, prefix="/api/v1/prompts", tags=["Prompts"])


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["System"], summary="Application info")
async def root() -> dict:
    """Return basic application metadata."""
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["System"], summary="Health check")
async def health_check() -> dict:
    """
    Lightweight health check endpoint.

    Returns the operational status of each subsystem. Actual connectivity
    probes (database ping, Docker socket check, Gemini reachability) will
    be added in a future iteration once those services are initialised.
    """
    return {
        "status": "healthy",
        "database": "not_checked",
        "docker": "not_checked",
        "ai": "not_checked",
    }
