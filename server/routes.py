"""API route definitions for the CorridorKey HTTP server."""

from __future__ import annotations

import logging
import time

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from .image_io import (
    create_uniform_mask,
    decode_upload,
    encode_png_base64,
    resize_for_preview,
)
from .schemas import (
    HealthResponse,
    InferenceRequest,
    KeyResponse,
    SettingsResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


def _get_service():
    """Retrieve the shared CorridorKeyService instance from app state.

    This is set during the lifespan startup in app.py.
    """
    from .app import _app_state

    return _app_state["service"]


def _get_config():
    from .app import _app_state

    return _app_state["config"]


def _process_image(
    image: np.ndarray,
    mask: np.ndarray,
    params: InferenceRequest,
) -> dict[str, np.ndarray]:
    """Run inference through the service engine with the GPU lock."""
    service = _get_service()
    # Access the engine directly (service handles GPU locking internally)
    engine = service._get_engine()
    with service._gpu_lock:
        result = engine.process_frame(
            image,
            mask,
            input_is_linear=params.input_is_linear,
            fg_is_straight=True,
            despill_strength=params.despill_strength,
            auto_despeckle=params.auto_despeckle,
            despeckle_size=params.despeckle_size,
            refiner_scale=params.refiner_scale,
        )
    return result


@router.post("/key", response_model=KeyResponse)
async def key_image(
    image: UploadFile = File(..., description="Input image (PNG/TIFF/JPEG/EXR)"),
    mask: UploadFile | None = File(
        default=None, description="Optional alpha hint mask (grayscale)"
    ),
    input_is_linear: bool = Form(default=False),
    despill_strength: float = Form(default=1.0),
    auto_despeckle: bool = Form(default=True),
    despeckle_size: int = Form(default=400),
    refiner_scale: float = Form(default=1.0),
):
    """Full-resolution keying of a single image.

    Accepts multipart form data with the image file and optional mask.
    If no mask is provided, a uniform white mask is used (full-frame keying).
    """
    t0 = time.monotonic()

    try:
        img_data = await image.read()
        img = decode_upload(img_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    # Read or create mask
    if mask is not None:
        try:
            mask_data = await mask.read()
            mask_arr = decode_upload(mask_data)
            # Convert to single channel
            if mask_arr.ndim == 3:
                mask_arr = mask_arr[:, :, 0]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid mask: {e}")
    else:
        mask_arr = create_uniform_mask(img.shape[0], img.shape[1])

    # Resize mask to match image if needed
    if mask_arr.shape[:2] != img.shape[:2]:
        import cv2

        mask_arr = cv2.resize(
            mask_arr, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR
        )

    params = InferenceRequest(
        input_is_linear=input_is_linear,
        despill_strength=despill_strength,
        auto_despeckle=auto_despeckle,
        despeckle_size=despeckle_size,
        refiner_scale=refiner_scale,
    )

    try:
        result = _process_image(img, mask_arr, params)
    except Exception as e:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    elapsed_ms = (time.monotonic() - t0) * 1000
    h, w = img.shape[:2]

    return KeyResponse(
        alpha=encode_png_base64(result["alpha"]),
        foreground=encode_png_base64(result["fg"]),
        composite=encode_png_base64(result["comp"]),
        processed=encode_png_base64(result["processed"]),
        width=w,
        height=h,
        processing_time_ms=round(elapsed_ms, 1),
    )


@router.post("/preview", response_model=KeyResponse)
async def preview_image(
    image: UploadFile = File(..., description="Input image (PNG/TIFF/JPEG/EXR)"),
    mask: UploadFile | None = File(
        default=None, description="Optional alpha hint mask (grayscale)"
    ),
    input_is_linear: bool = Form(default=False),
    despill_strength: float = Form(default=1.0),
    auto_despeckle: bool = Form(default=True),
    despeckle_size: int = Form(default=400),
    refiner_scale: float = Form(default=1.0),
):
    """Preview keying at reduced resolution for fast interactive feedback.

    Same interface as /key but downscales the image before processing.
    """
    t0 = time.monotonic()
    config = _get_config()

    try:
        img_data = await image.read()
        img = decode_upload(img_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    # Downscale for preview
    img_preview = resize_for_preview(img, config.preview_size)

    # Read or create mask, then resize to match preview
    if mask is not None:
        try:
            mask_data = await mask.read()
            mask_arr = decode_upload(mask_data)
            if mask_arr.ndim == 3:
                mask_arr = mask_arr[:, :, 0]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid mask: {e}")
        mask_arr = resize_for_preview(mask_arr, config.preview_size)
    else:
        mask_arr = create_uniform_mask(img_preview.shape[0], img_preview.shape[1])

    # Ensure dimensions match after independent resize
    if mask_arr.shape[:2] != img_preview.shape[:2]:
        import cv2

        mask_arr = cv2.resize(
            mask_arr,
            (img_preview.shape[1], img_preview.shape[0]),
            interpolation=cv2.INTER_LINEAR,
        )

    params = InferenceRequest(
        input_is_linear=input_is_linear,
        despill_strength=despill_strength,
        auto_despeckle=auto_despeckle,
        despeckle_size=despeckle_size,
        refiner_scale=refiner_scale,
    )

    try:
        result = _process_image(img_preview, mask_arr, params)
    except Exception as e:
        logger.exception("Preview inference failed")
        raise HTTPException(status_code=500, detail=f"Preview failed: {e}")

    elapsed_ms = (time.monotonic() - t0) * 1000
    h, w = img_preview.shape[:2]

    return KeyResponse(
        alpha=encode_png_base64(result["alpha"]),
        foreground=encode_png_base64(result["fg"]),
        composite=encode_png_base64(result["comp"]),
        processed=encode_png_base64(result["processed"]),
        width=w,
        height=h,
        processing_time_ms=round(elapsed_ms, 1),
    )


@router.get("/health", response_model=HealthResponse)
async def health():
    """Health check — reports device, model status, and GPU info."""
    service = _get_service()

    vram = service.get_vram_info()
    return HealthResponse(
        status="ok",
        device=service._device,
        model_loaded=service.is_engine_loaded(),
        gpu_name=vram.get("name"),
        vram_total_gb=round(vram["total"], 2) if "total" in vram else None,
        vram_free_gb=round(vram["free"], 2) if "free" in vram else None,
    )


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """Return current defaults and parameter ranges."""
    config = _get_config()
    service = _get_service()

    return SettingsResponse(
        defaults=InferenceRequest(),
        preview_size=config.preview_size,
        device=service._device,
        parameter_ranges={
            "despill_strength": {"min": 0.0, "max": 1.0, "step": 0.05},
            "despeckle_size": {"min": 0, "max": 2000, "step": 50},
            "refiner_scale": {"min": 0.0, "max": 3.0, "step": 0.1},
        },
    )
