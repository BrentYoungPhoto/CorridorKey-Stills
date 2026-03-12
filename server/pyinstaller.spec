# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for the CorridorKey HTTP server backend.

Builds a single-directory bundle containing:
- Python interpreter + all dependencies (torch, cv2, numpy, etc.)
- FastAPI server code
- CorridorKeyModule inference engine
- Model checkpoint (~300MB)

Usage:
    pyinstaller server/pyinstaller.spec

Output: dist/corridorkey-server/
"""

import os
import sys
import platform

block_cipher = None

# Project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(SPECPATH))

# Detect platform for conditional includes
IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"

# Checkpoint path
CHECKPOINT_DIR = os.path.join(PROJECT_ROOT, "CorridorKeyModule", "checkpoints")

a = Analysis(
    [os.path.join(PROJECT_ROOT, "server", "run.py")],
    pathex=[PROJECT_ROOT],
    binaries=[],
    datas=[
        # Model checkpoint
        (CHECKPOINT_DIR, os.path.join("CorridorKeyModule", "checkpoints")),
        # CorridorKeyModule source (needed for dynamic imports)
        (os.path.join(PROJECT_ROOT, "CorridorKeyModule"), "CorridorKeyModule"),
        # Backend service layer
        (os.path.join(PROJECT_ROOT, "backend"), "backend"),
        # Device utilities
        (os.path.join(PROJECT_ROOT, "device_utils.py"), "."),
    ],
    hiddenimports=[
        # FastAPI + Uvicorn
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "fastapi",
        "pydantic",
        "starlette",
        # Server modules
        "server",
        "server.app",
        "server.routes",
        "server.schemas",
        "server.image_io",
        "server.config",
        # Backend
        "backend",
        "backend.service",
        "backend.clip_state",
        "backend.errors",
        "backend.frame_io",
        "backend.validators",
        "backend.job_queue",
        "backend.project",
        "backend.natural_sort",
        # CorridorKeyModule
        "CorridorKeyModule",
        "CorridorKeyModule.backend",
        "CorridorKeyModule.inference_engine",
        "CorridorKeyModule.core",
        "CorridorKeyModule.core.color_utils",
        "CorridorKeyModule.core.model_transformer",
        # PyTorch (complex dependency tree)
        "torch",
        "torch.nn",
        "torch.nn.functional",
        "torchvision",
        "timm",
        "timm.models",
        "timm.models.hiera",
        # Image processing
        "cv2",
        "numpy",
        "PIL",
        "PIL.Image",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude optional alpha hint generators (not needed for still image keying)
        "gvm_core",
        "VideoMaMaInferenceModule",
        "diffusers",
        "transformers",
        "accelerate",
        "peft",
        # Exclude dev/test dependencies
        "pytest",
        "ruff",
        "matplotlib",
        # Exclude notebook/REPL dependencies
        "IPython",
        "jupyter",
        "notebook",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="corridorkey-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Server needs console for log output
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="corridorkey-server",
)
