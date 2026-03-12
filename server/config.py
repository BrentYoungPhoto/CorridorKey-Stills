"""Server configuration — CLI args, environment variables, defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass
class ServerConfig:
    """Configuration for the CorridorKey HTTP server."""

    host: str = "127.0.0.1"
    port: int = int(os.environ.get("CORRIDORKEY_PORT", "8741"))
    # Model checkpoint directory (auto-detected if not set)
    model_dir: str | None = os.environ.get("CORRIDORKEY_MODEL_DIR")
    # Device override (auto-detected if not set)
    device: str | None = os.environ.get("CORRIDORKEY_DEVICE")
    # Maximum image dimension for preview endpoint
    preview_size: int = 1024
    # Allowed CORS origins (Photoshop UXP, Electron, localhost dev)
    cors_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://localhost:*",
        ]
    )
