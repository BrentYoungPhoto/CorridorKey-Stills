"""FastAPI application — CORS, lifespan, model loading."""

from __future__ import annotations

import logging
import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ServerConfig
from .routes import router

logger = logging.getLogger(__name__)

# Shared application state (populated during lifespan startup)
_app_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: detect device, load model. Shutdown: unload engines."""
    config: ServerConfig = app.state.config

    # Ensure project root is on sys.path so backend/ and CorridorKeyModule/ are importable
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from backend.service import CorridorKeyService

    service = CorridorKeyService()

    # Detect GPU device
    if config.device:
        os.environ["CORRIDORKEY_DEVICE"] = config.device
    device = service.detect_device()
    logger.info(f"Device: {device}")

    # Pre-load the inference engine so first request is fast
    logger.info("Pre-loading inference engine...")
    engine = service._get_engine()
    logger.info("Engine ready")

    _app_state["service"] = service
    _app_state["config"] = config

    yield

    # Shutdown
    logger.info("Shutting down — unloading engines...")
    service.unload_engines()
    _app_state.clear()


def create_app(config: ServerConfig | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    config = config or ServerConfig()

    app = FastAPI(
        title="CorridorKey Server",
        description="HTTP API for CorridorKey neural green screen keying",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.config = config

    # CORS — allow Photoshop UXP, Electron, and local dev origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Localhost-only server; broad CORS is safe
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    return app
