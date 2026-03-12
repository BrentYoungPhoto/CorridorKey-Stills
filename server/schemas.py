"""Pydantic request/response models for the CorridorKey API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class InferenceRequest(BaseModel):
    """Parameters for a keying request. Image data sent separately as multipart."""

    input_is_linear: bool = False
    despill_strength: float = Field(default=1.0, ge=0.0, le=1.0)
    auto_despeckle: bool = True
    despeckle_size: int = Field(default=400, ge=0)
    refiner_scale: float = Field(default=1.0, ge=0.0)


class KeyResponse(BaseModel):
    """Response from /key and /preview endpoints."""

    alpha: str  # base64-encoded PNG
    foreground: str  # base64-encoded PNG (sRGB, straight)
    composite: str  # base64-encoded PNG (sRGB, on checkerboard)
    processed: str  # base64-encoded PNG (RGBA premultiplied linear)
    width: int
    height: int
    processing_time_ms: float


class HealthResponse(BaseModel):
    """Response from /health endpoint."""

    status: str  # "ok" | "loading" | "error"
    device: str
    model_loaded: bool
    gpu_name: str | None = None
    vram_total_gb: float | None = None
    vram_free_gb: float | None = None


class SettingsResponse(BaseModel):
    """Current server settings and parameter ranges."""

    defaults: InferenceRequest
    preview_size: int
    device: str
    parameter_ranges: dict
