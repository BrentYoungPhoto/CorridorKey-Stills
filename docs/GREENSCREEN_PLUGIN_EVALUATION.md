# CorridorKey: Greenscreen Plugin & App Evaluation

## Overview

This document evaluates two approaches for making CorridorKey available as a
user-friendly tool for still image green screen keying: a **Photoshop UXP
plugin** and a **standalone Electron app**. Both share a common Python HTTP
backend that wraps the existing `CorridorKeyService`.

## Architecture

All approaches share a single backend server:

```
┌──────────────────────┐      HTTP/JSON      ┌─────────────────────────┐
│   Photoshop UXP      │◄──────────────────►│                         │
│   Plugin (JS)        │   localhost:8741    │   FastAPI Server        │
└──────────────────────┘                     │   (Python + PyTorch)    │
                                             │                         │
┌──────────────────────┐      HTTP/JSON      │   Wraps:               │
│   Electron App       │◄──────────────────►│   - CorridorKeyService  │
│   (React + Node.js)  │   localhost:8741    │   - CorridorKeyEngine   │
└──────────────────────┘                     │   - GPU inference       │
                                             └─────────────────────────┘
```

### Backend Server (`server/`)

A FastAPI HTTP server wrapping `CorridorKeyService` with these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/key` | POST | Full-resolution keying (multipart image + params) |
| `/api/v1/preview` | POST | Reduced-resolution preview (fast, interactive) |
| `/api/v1/health` | GET | Device status, GPU info, model load state |
| `/api/v1/settings` | GET | Parameter defaults and ranges |

The server loads the model once at startup and keeps it resident in GPU memory.
All inference is serialized through a GPU lock for thread safety.

## Approach 1: Photoshop UXP Plugin (`corridorkey-uxp/`)

### How It Works

The plugin adds a panel inside Photoshop with parameter sliders and action
buttons. When the user clicks "Key Active Layer":

1. Plugin reads the active layer's pixel data via the UXP `imaging` API
2. Sends it as multipart form data to the local backend server
3. Receives alpha matte + despilled foreground as base64 PNG
4. Uses `batchPlay` to apply results as layer mask / new layer / alpha channel

### Strengths

- **Integrated workflow**: No context switching — stays inside Photoshop
- **Leverages PS formats**: Photoshop handles all file I/O (PSD, TIFF, EXR)
- **Familiar UX**: Photographers already know the Photoshop panel paradigm
- **Layer-aware**: Can apply results directly as masks on specific layers

### Weaknesses

- **Two-component install**: User must run both the plugin AND the backend server
- **Adobe API fragility**: UXP `imaging` API changes across PS versions; `batchPlay`
  descriptors are underdocumented and version-dependent
- **Sandbox restrictions**: UXP may block `fetch` to `http://localhost` in some
  configurations; needs testing per PS version
- **Large image transfer**: 50MP RGBA as base64 is ~260MB; needs file-based
  exchange for production use
- **No Linux**: Photoshop doesn't run on Linux
- **Distribution**: Creative Cloud Marketplace takes 85/15 revenue split;
  manual install is complex for non-technical users

### Minimum Photoshop Version

PS 2024 (v25.0) — required for the UXP `imaging` module that supports reading
raw pixel data from layers.

---

## Approach 2: Electron App (`electron-app/`)

### How It Works

A standalone desktop app with:

- **Main process**: Spawns the Python backend as a child process, manages window
- **Renderer**: React-based UI with drag-and-drop, live parameter sliders,
  canvas preview with checkerboard, view mode switching (composite/alpha/FG)
- **Backend**: Same FastAPI server, lifecycle fully managed by Electron

### Strengths

- **Self-contained**: Single installer bundles everything (Electron + Python backend)
- **Full control**: No dependency on Adobe's API stability
- **Cross-platform**: Windows, macOS, and Linux
- **Better preview**: Full-window WebGL canvas, zoom/pan, split views
- **Batch processing**: Natural to add multi-image processing
- **Direct distribution**: Website download, auto-update, no marketplace cut
- **Faster iteration**: Well-documented Electron/React ecosystem

### Weaknesses

- **Not integrated**: Users must export from PS, key in the app, reimport
- **Large bundle**: ~2.5-3GB (Windows w/ CUDA), ~1.1GB (macOS w/ MPS)
- **Electron overhead**: ~200MB RAM just for the shell
- **No PSD write**: Would need `ag-psd` or similar library for PSD output

---

## Comparison

| Criterion | Photoshop Plugin | Electron App |
|-----------|:----------------:|:------------:|
| Installation simplicity | Fair | Good |
| User experience | Good (integrated) | Good (standalone) |
| Cross-platform | Win/Mac | Win/Mac/Linux |
| Development effort | High | Medium |
| Maintenance burden | High (Adobe API) | Low |
| Batch processing | Awkward | Natural |
| Distribution control | Limited (Marketplace) | Full |
| Bundle size | Server only (~2-3GB) | ~2.5-3GB total |
| Revenue model | 85/15 split | 100% direct |
| Preview quality | Thumbnail in panel | Full-window canvas |

## Recommendation

**Build the Electron App first (Phase 1), then the Photoshop Plugin (Phase 2).**

### Rationale

1. The Electron app validates the full pipeline end-to-end without Adobe
   dependency
2. The Python backend is identical for both — build it once, reuse everywhere
3. The Electron app reaches a wider audience sooner (includes Linux)
4. The Photoshop plugin becomes an incremental add-on leveraging the proven
   backend

### Phased Timeline

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| 1 | FastAPI backend server | 2-3 weeks |
| 2 | Electron app (UI + backend integration) | 5-6 weeks |
| 3 | PyInstaller packaging + installers | 1-2 weeks |
| 4 | Photoshop UXP plugin | 3-4 weeks |

## Still Image Considerations

The current CorridorKey pipeline processes frame-by-frame with no temporal
dependencies, so still image support is inherently built in. Key adaptations:

- **Resolution**: Camera stills can be 50MP+. The pipeline resizes internally to
  2048x2048 then upscales back via Lanczos4. A future guided upsampling step
  (using the full-res image as an edge guide) would improve fine detail.
- **Bit depth**: Pipeline works in float32 internally. Input/output paths handle
  8-bit, 16-bit, and float formats via OpenCV.
- **Color space**: sRGB linearization is built in (`input_is_linear` flag).
  Wider gamut (ProPhoto RGB, Adobe RGB) is a future enhancement.
- **No mask required**: For stills without a pre-made alpha hint, the server
  creates a uniform white mask (full-frame keying).

## Files Created

### Backend Server
```
server/
├── __init__.py          # Package marker
├── app.py               # FastAPI app, CORS, lifespan (model loading)
├── config.py            # Server configuration (port, device, preview size)
├── image_io.py          # numpy <-> PNG/base64 encoding/decoding
├── routes.py            # API endpoints (/key, /preview, /health, /settings)
├── schemas.py           # Pydantic request/response models
├── run.py               # CLI entry point (python -m server.run)
└── pyinstaller.spec     # PyInstaller build specification
```

### Electron App
```
electron-app/
├── package.json         # Dependencies + electron-builder config
├── main.js              # Main process (backend spawn, window management)
├── preload.js           # Context bridge (secure IPC)
├── vite.config.js       # Vite bundler config
└── src/
    ├── index.html       # HTML shell
    ├── main.jsx         # React entry point
    ├── App.jsx          # Root component
    ├── components/
    │   ├── ImageDropzone.jsx   # Drag-and-drop image input
    │   ├── ParameterPanel.jsx  # Slider controls for inference params
    │   ├── PreviewCanvas.jsx   # Canvas display with view modes
    │   ├── OutputPanel.jsx     # Export buttons
    │   └── StatusBar.jsx       # GPU status, processing time
    ├── services/
    │   ├── backendClient.js    # HTTP client for FastAPI backend
    │   └── imageUtils.js       # Base64/file conversion utilities
    ├── stores/
    │   └── appStore.js         # Zustand state management
    └── styles/
        └── theme.css           # Dark theme CSS
```

### Photoshop UXP Plugin
```
corridorkey-uxp/
├── manifest.json        # UXP plugin manifest (PS 25+)
├── index.html           # Panel HTML
├── plugin.js            # Main plugin logic
├── styles.css           # Spectrum-like styling
└── lib/
    ├── backendClient.js      # HTTP client for backend
    └── photoshopActions.js   # batchPlay wrappers (layer mask, channels)
```
