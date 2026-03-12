"""Image encoding/decoding between numpy arrays and transport formats."""

from __future__ import annotations

import base64
import io
from typing import Literal

import cv2
import numpy as np
from PIL import Image


def decode_upload(data: bytes) -> np.ndarray:
    """Decode uploaded image bytes (PNG/TIFF/JPEG/EXR) to float32 RGB [0,1].

    Returns:
        np.ndarray [H, W, 3] float32 in range [0, 1].
    """
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Could not decode uploaded image")

    # Handle different channel counts
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)
    elif img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Normalize to float32 [0, 1]
    if img.dtype == np.uint8:
        return img.astype(np.float32) / 255.0
    elif img.dtype == np.uint16:
        return img.astype(np.float32) / 65535.0
    elif img.dtype in (np.float32, np.float64):
        return img.astype(np.float32)
    else:
        return img.astype(np.float32) / 255.0


def encode_png_base64(arr: np.ndarray) -> str:
    """Encode a numpy array to base64-encoded PNG string.

    Args:
        arr: [H, W, C] float32 [0,1] or [H, W] for single-channel.
    """
    img = np.clip(arr, 0.0, 1.0)

    if img.ndim == 2:
        img_u8 = (img * 255.0).astype(np.uint8)
        pil = Image.fromarray(img_u8, mode="L")
    elif img.shape[2] == 1:
        img_u8 = (img[:, :, 0] * 255.0).astype(np.uint8)
        pil = Image.fromarray(img_u8, mode="L")
    elif img.shape[2] == 3:
        img_u8 = (img * 255.0).astype(np.uint8)
        pil = Image.fromarray(img_u8, mode="RGB")
    elif img.shape[2] == 4:
        img_u8 = (img * 255.0).astype(np.uint8)
        pil = Image.fromarray(img_u8, mode="RGBA")
    else:
        raise ValueError(f"Unexpected channel count: {img.shape[2]}")

    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def resize_for_preview(img: np.ndarray, max_size: int) -> np.ndarray:
    """Resize image so longest side is at most max_size, preserving aspect ratio.

    Args:
        img: [H, W, C] float32.
        max_size: Maximum dimension.

    Returns:
        Resized image (or original if already smaller).
    """
    h, w = img.shape[:2]
    if max(h, w) <= max_size:
        return img
    scale = max_size / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)


def create_uniform_mask(h: int, w: int, value: float = 1.0) -> np.ndarray:
    """Create a uniform mask (all white by default) for still images without alpha hints.

    Returns:
        np.ndarray [H, W] float32.
    """
    return np.full((h, w), value, dtype=np.float32)
